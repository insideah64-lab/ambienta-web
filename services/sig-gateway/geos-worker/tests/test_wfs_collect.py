"""Hermetic WFS+GEOS integration tests: never call an external provider in CI."""
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch
import zipfile
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import wfs_collect as wf
from clip import GeoReviewError


BBOX=[-66.2,-25.1,-66.0,-24.9]


def square(cx,cy,r=0.004):
    return [[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r],[cx-r,cy-r]]


def feature(id,ring,holes=None):
    return {"type":"Feature","id":id,
            "properties":{"nombre":id},
            "geometry":{"type":"Polygon","coordinates":[ring]+(holes or [])}}


def fixture_features():
    # 25 disjoint polygons plus one that crosses all four tile borders.
    out=[]
    for i in range(25):
        x=-66.18+0.04*(i%5)
        y=-25.08+0.04*(i//5)
        out.append(feature(f"municipios.{i:03}",square(x,y)))
    out.append(feature("municipios.boundary",square(-66.1,-25.0,.012)))
    return out


class FakeResponse(io.BytesIO):
    def __init__(self,content,status=200,content_type="application/json"):
        super().__init__(content)
        self.status=status
        self.headers={"Content-Type":content_type}


class FakeWfs:
    def __init__(self,features=None,mutate=None):
        self.features=fixture_features() if features is None else features
        self.mutate=mutate
        self.calls=[]
        self.payloads=[]

    def __call__(self,url,timeout):
        parsed=urlsplit(url)
        assert parsed.scheme=="https"
        assert parsed.netloc=="geoportal.salta.gob.ar"
        assert parsed.path=="/geoserver/wfs"
        query=parse_qs(parsed.query)
        assert query["maxFeatures"]==["20"]
        assert query["typeName"]==["geonode:municipios"]
        assert query["srsName"]==["EPSG:4326"]
        assert "startIndex" not in query
        bb=query["bbox"][0].split(",")
        assert bb[-1]=="EPSG:4326"
        west,south,east,north=map(float,bb[:4])
        assert west<east and south<north
        matches=[]
        for item in self.features:
            ring=item["geometry"]["coordinates"][0]
            xs=[p[0] for p in ring]
            ys=[p[1] for p in ring]
            if max(xs)>=west and min(xs)<=east and max(ys)>=south and min(ys)<=north:
                matches.append(item)
        payload={"type":"FeatureCollection",
                 "crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}},
                 "totalFeatures":len(matches),
                 "numberReturned":min(len(matches),20),
                 "features":matches[:20]}
        self.calls.append((url,timeout,len(matches)))
        if self.mutate:
            payload=self.mutate(payload,len(self.calls))
        raw=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf8")
        self.payloads.append(raw)
        return FakeResponse(raw)


class WfsTilesTest(unittest.TestCase):
    def setUp(self):
        self.work=tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.base=Path(self.work.name)

    def test_adaptive_quadtree_full_count_and_duplicate_reconciliation(self):
        fake=FakeWfs()
        acquisition,source=wf.acquire("municipios",BBOX,open_fn=fake)
        self.assertEqual(len(source["features"]),26)
        self.assertEqual(acquisition.root_count,26)
        self.assertEqual(source["numberOfFeatures"],26)
        self.assertEqual(len(acquisition.pages),5)
        self.assertEqual(len(acquisition.accepted),26)
        self.assertFalse(acquisition.pages[0].is_complete)
        self.assertTrue(all(p.is_complete for p in acquisition.pages[1:]))
        self.assertEqual(len([p for p in acquisition.pages if p.total>20]),1)
        self.assertEqual(len(fake.calls),5)
        self.assertEqual(source["features"][0]["id"],"municipios.000")

    def test_bundle_contains_every_raw_page_with_digest_and_real_geos_clip(self):
        fake=FakeWfs()
        target=self.base/"proof.zip"
        manifest=wf.build_archive("municipios",BBOX,target,open_fn=fake)
        self.assertTrue(target.exists())
        self.assertEqual(manifest["requestCount"],5)
        self.assertEqual(manifest["observedSourceCount"],26)
        self.assertEqual(manifest["selectedCount"],26)
        self.assertFalse(manifest["snapshotAtomic"])
        self.assertEqual(manifest["hashScope"],"assembled_geojson_not_raw_wfs_response")
        self.assertTrue(manifest["rawSourceResponsesRetained"])
        with zipfile.ZipFile(target) as archive:
            self.assertEqual(archive.namelist()[-4:],
                             ["assembled_source.geojson","clip.geojson","clip_report.json",
                              "acquisition_manifest.json"])
            original_source=archive.read("assembled_source.geojson")
            self.assertEqual(hashlib.sha256(original_source).hexdigest(),
                             manifest["sourceFileSha256"])
            source=json.loads(original_source)
            clip=json.loads(archive.read("clip.geojson"))
            self.assertEqual(len(source["features"]),26)
            self.assertEqual(len(clip["features"]),26)
            for index,p in enumerate(manifest["pages"]):
                raw=archive.read(p["name"])
                self.assertEqual(raw,fake.payloads[index])
                self.assertEqual(hashlib.sha256(raw).hexdigest(),p["rawSha256"])
                self.assertEqual(len(raw),p["rawBytes"])

    def test_single_hole_preserved_by_geos(self):
        hole=square(-66.1,-25,0.02)
        outer=square(-66.1,-25,0.08)
        fake=FakeWfs([feature("hole.1",outer,[hole])])
        target=self.base/"holes.zip"
        report=wf.build_archive("municipios",BBOX,target,open_fn=fake)
        self.assertEqual(report["requestCount"],1)
        with zipfile.ZipFile(target) as archive:
            clip=json.loads(archive.read("clip.geojson"))
        self.assertEqual(len(clip["features"][0]["geometry"]["coordinates"]),2)

    def test_synthetically_concave_feature_remains_valid(self):
        ring=[[-66.19,-25.09],[-66.01,-25.09],[-66.01,-24.91],
              [-66.08,-24.91],[-66.08,-25.04],[-66.12,-25.04],
              [-66.12,-24.91],[-66.19,-24.91],[-66.19,-25.09]]
        fake=FakeWfs([feature("concave.1",ring)])
        target=self.base/"concave.zip"
        data=wf.build_archive("municipios",BBOX,target,open_fn=fake)
        self.assertEqual(data["selectedCount"],1)

    def test_missing_feature_id_blocks_without_creating_export(self):
        bad=feature("has-id",square(-66.1,-25))
        del bad["id"]
        fake=FakeWfs([bad])
        target=self.base/"blocked.zip"
        with self.assertRaisesRegex(wf.AcquisitionError,"identificador"):
            wf.build_archive("municipios",BBOX,target,open_fn=fake)
        self.assertFalse(target.exists())

    def test_incomplete_terminal_leaf_rejected(self):
        def corrupt(payload,call):
            if call>1:
                payload["features"]=payload["features"][:-1]
                payload["numberReturned"]=len(payload["features"])
            return payload
        fake=FakeWfs(mutate=corrupt)
        with self.assertRaisesRegex(wf.AcquisitionError,"incompleta"):
            wf.acquire("municipios",BBOX,open_fn=fake)

    def test_duplicate_with_different_attributes_rejected(self):
        def mutate(payload,call):
            if call>=2:
                for item in payload["features"]:
                    if item["id"]=="municipios.boundary":
                        item["properties"]={"nombre":"cambió","version":call}
            return payload
        fake=FakeWfs(mutate=mutate)
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=fake)
        self.assertEqual(context.exception.code,"CHANGING_FEATURE")

    def test_root_count_mismatch_blocks_export(self):
        def corrupt(payload,call):
            if call==1:
                payload["totalFeatures"]=27
            return payload
        target=self.base/"reject.zip"
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.build_archive("municipios",BBOX,target,open_fn=FakeWfs(mutate=corrupt))
        self.assertEqual(context.exception.code,"ROOT_COUNT_MISMATCH")
        self.assertFalse(target.exists())

    def test_request_cap_is_enforced_when_provider_cannot_fit_tiles(self):
        # Thirty geometries spanning all children produce repeated >20 responses.
        shared=[feature("large."+str(i),square(-66.1,-25,0.09)) for i in range(30)]
        fake=FakeWfs(features=shared)
        with patch.object(wf,"MAX_WFS_REQUESTS",6):
            with self.assertRaises(wf.AcquisitionError) as context:
                wf.acquire("municipios",BBOX,open_fn=fake)
        self.assertEqual(context.exception.code,"REQUEST_BUDGET")
        self.assertEqual(len(fake.calls),6)

    def test_security_origin_bounds_crs_and_missing_counts(self):
        with self.assertRaises(wf.AcquisitionError):
            wf.validate_request("arbitrary_url",BBOX)
        with self.assertRaises(wf.AcquisitionError):
            wf.validate_request("municipios",[-66,-25,-65.1,-24.9])
        def bad_crs(payload,_):
            payload["crs"]["properties"]["name"]="EPSG:3857"
            return payload
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=FakeWfs(mutate=bad_crs))
        self.assertEqual(context.exception.code,"CRS_REVIEW")
        def missing_count(payload,_):
            del payload["totalFeatures"]
            return payload
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=FakeWfs(mutate=missing_count))
        self.assertEqual(context.exception.code,"COUNT_UNKNOWN")

    def test_input_large_response_and_existing_zip_fail_closed(self):
        fake=FakeWfs()
        target=self.base/"already.zip"
        target.write_bytes(b"DO NOT MODIFY")
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.build_archive("municipios",BBOX,target,open_fn=fake)
        self.assertEqual(context.exception.code,"OUTPUT_EXISTS")
        self.assertEqual(target.read_bytes(),b"DO NOT MODIFY")
        self.assertEqual(len(fake.calls),0)
        def too_large(url,timeout):
            return FakeResponse(b"x"*(wf.MAX_PER_RESPONSE_BYTES+1))
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=too_large)
        self.assertEqual(context.exception.code,"PAGE_TOO_LARGE")

    def test_self_intersection_never_creates_archive(self):
        bowtie=[[-66.15,-25.04],[-66.05,-24.96],[-66.15,-24.96],
                [-66.05,-25.04],[-66.15,-25.04]]
        target=self.base/"topology.zip"
        with self.assertRaises(GeoReviewError):
            wf.build_archive("municipios",BBOX,target,
                             open_fn=FakeWfs([feature("bad.1",bowtie)]))
        self.assertFalse(target.exists())


    def test_exactly_max_features_is_ambiguous_and_subdivided(self):
        fake=FakeWfs(features=fixture_features()[:20])
        result,source=wf.acquire("municipios",BBOX,open_fn=fake)
        self.assertEqual(len(source["features"]),20)
        self.assertEqual(len(result.pages),5)
        self.assertEqual(result.root_count,20)
        self.assertEqual(len([p for p in result.pages if p.depth==0]),1)
        self.assertEqual(result.pages[0].total,20)

    def test_masked_overflow_count_at_page_limit_is_caught_by_tiling(self):
        # A broken provider falsely says total=20 even when 26 match root.
        def hidden_overflow(payload,call):
            if call==1:
                payload["totalFeatures"]=20
            return payload
        fake=FakeWfs(mutate=hidden_overflow)
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=fake)
        self.assertEqual(context.exception.code,"ROOT_COUNT_MISMATCH")

    def test_conflicting_wfs_totals_are_rejected(self):
        def contradict(payload,call):
            payload["numberMatched"]=payload["totalFeatures"]+1
            return payload
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=FakeWfs(mutate=contradict))
        self.assertEqual(context.exception.code,"COUNT_CONFLICT")

    def test_provider_json_with_html_content_type_is_rejected(self):
        fake=FakeWfs()
        def html_type(url,timeout):
            response=fake(url,timeout)
            response.headers={"Content-Type":"text/html"}
            return response
        with self.assertRaises(wf.AcquisitionError) as context:
            wf.acquire("municipios",BBOX,open_fn=html_type)
        self.assertEqual(context.exception.code,"INVALID_PROVIDER_FORMAT")

    def test_expired_total_job_budget_stops_before_any_new_request(self):
        fake=FakeWfs()
        job=wf.Acquisition("municipios",BBOX,0)
        job.started-=wf.MAX_JOB_SECONDS+1
        with self.assertRaises(wf.AcquisitionError) as context:
            job.visit(BBOX,0,fake,8)
        self.assertEqual(context.exception.code,"TIME_BUDGET")
        self.assertEqual(len(fake.calls),0)


if __name__=="__main__":
    unittest.main()
