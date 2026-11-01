"""Offline re-verification of archived original WFS bytes and GEOS result."""
import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from wfs_collect import build_archive, AcquisitionError
from verify_bundle import verify_bundle
from test_wfs_collect import FakeWfs, BBOX


class BundleVerificationTest(unittest.TestCase):
    def setUp(self):
        self.sandbox=tempfile.TemporaryDirectory()
        self.addCleanup(self.sandbox.cleanup)
        self.root=Path(self.sandbox.name)
        self.original=self.root/"source-proof.zip"
        self.manifest=build_archive("municipios",BBOX,self.original,open_fn=FakeWfs())

    def rewrite(self,name,alter):
        with zipfile.ZipFile(self.original) as original:
            contents={n:original.read(n) for n in original.namelist()}
        alter(contents)
        target=self.root/name
        with zipfile.ZipFile(target,"w",compression=zipfile.ZIP_DEFLATED) as out:
            for n,data in contents.items():
                out.writestr(n,data)
        return target

    def test_complete_bundle_passes_with_replayed_geometry(self):
        result=verify_bundle(self.original)
        self.assertEqual(result["result"],"PASS")
        self.assertEqual(result["sourceCount"],26)
        self.assertEqual(result["selectedCount"],26)
        self.assertEqual(result["rawResponsesVerified"],5)
        self.assertFalse(result["providerSnapshotAtomic"])
        self.assertEqual(result["verifiedSha256"],self.manifest["sourceFileSha256"])

    def test_raw_response_tampering_is_rejected(self):
        def alter(items):
            raw=bytearray(items["raw_wfs/002.geojson"])
            raw[-2] = raw[-2] if raw[-2]==ord("q") else ord("q")
            items["raw_wfs/002.geojson"]=bytes(raw)
        changed=self.rewrite("raw-tampered.zip",alter)
        with self.assertRaises(AcquisitionError) as x:
            verify_bundle(changed)
        self.assertEqual(x.exception.code,"BUNDLE_HASH_MISMATCH")

    def test_assembled_source_tampering_is_rejected(self):
        def alter(items):
            doc=json.loads(items["assembled_source.geojson"])
            doc["features"][0]["properties"]["nombre"]="altered after acquisition"
            items["assembled_source.geojson"]=json.dumps(doc).encode()
        changed=self.rewrite("source-tampered.zip",alter)
        with self.assertRaises(AcquisitionError):
            verify_bundle(changed)

    def test_derived_geos_result_tampering_is_rejected(self):
        def alter(items):
            doc=json.loads(items["clip.geojson"])
            doc["features"]=doc["features"][:-1]
            items["clip.geojson"]=json.dumps(doc).encode()
        changed=self.rewrite("clip-tampered.zip",alter)
        with self.assertRaises(AcquisitionError):
            verify_bundle(changed)

    def test_bad_tile_sequence_is_rejected(self):
        def alter(items):
            manifest=json.loads(items["acquisition_manifest.json"])
            manifest["pages"][2]["bbox"][0]+=0.00001
            items["acquisition_manifest.json"]=json.dumps(manifest).encode()
        changed=self.rewrite("tile-tampered.zip",alter)
        with self.assertRaises(AcquisitionError):
            verify_bundle(changed)

    def test_extra_file_and_missing_page_are_rejected(self):
        def extra(items):
            items["../../secret.txt"]=b"bad"
        changed=self.rewrite("unsafe-path.zip",extra)
        with self.assertRaises(AcquisitionError):
            verify_bundle(changed)
        def remove(items):
            del items["raw_wfs/003.geojson"]
        changed=self.rewrite("missing-page.zip",remove)
        with self.assertRaises(AcquisitionError):
            verify_bundle(changed)

    def test_forged_total_count_is_rejected(self):
        def alter(items):
            manifest=json.loads(items["acquisition_manifest.json"])
            manifest["observedSourceCount"]=27
            items["acquisition_manifest.json"]=json.dumps(manifest).encode()
        changed=self.rewrite("count-tampered.zip",alter)
        with self.assertRaises(AcquisitionError):
            verify_bundle(changed)


if __name__=="__main__":
    unittest.main()
