import hashlib
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from clip import GeoReviewError, prepare


class TestAdvancedGeoClip(unittest.TestCase):
    def setUp(self):
        self.sandbox = tempfile.TemporaryDirectory()
        self.addCleanup(self.sandbox.cleanup)
        self.root = Path(self.sandbox.name)

    def write(self, geometries, extra=None):
        obj = {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {"name": f"Entidad {i}"},
             "geometry": geometry} for i, geometry in enumerate(geometries)
        ]}
        if extra:
            obj.update(extra)
        path = self.root / "original.geojson"
        path.write_text(json.dumps(obj), encoding="utf-8")
        return path

    def poly(self, shell, holes=None):
        return {"type": "Polygon", "coordinates": [shell] + (holes or [])}

    def test_concave_u_shape_splits_into_multipolygon(self):
        ring = [[-3, -3], [3, -3], [3, 3], [2, 3], [2, -2],
                [-2, -2], [-2, 3], [-3, 3], [-3, -3]]
        path = self.write([self.poly(ring)])
        before = path.read_bytes()
        result, report = prepare(path, [-3, 0, 3, 2])
        self.assertEqual(report["sourceCount"], 1)
        self.assertEqual(report["selectedCount"], 1)
        self.assertEqual(result["features"][0]["geometry"]["type"], "MultiPolygon")
        self.assertEqual(len(result["features"][0]["geometry"]["coordinates"]), 2)
        self.assertEqual(before, path.read_bytes())
        self.assertEqual(report["sourceSha256"], hashlib.sha256(before).hexdigest())

    def test_hole_preserved_and_original_untouched(self):
        shell = [[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]]
        hole = [[-0.2,-0.2],[0.2,-0.2],[0.2,0.2],[-0.2,0.2],[-0.2,-0.2]]
        path = self.write([self.poly(shell, [hole])])
        derived, report = prepare(path, [-1, -1, 1, 1])
        self.assertEqual(report["status"], "complete")
        coords = derived["features"][0]["geometry"]["coordinates"]
        self.assertEqual(len(coords), 2)
        self.assertFalse(report["queryIsProjectPerimeter"])
        self.assertEqual(report["hashScope"], "original_input_file_bytes")

    def test_large_polygon_greater_than_browser_limit(self):
        # Browser V3 rejects >12,000 vertices. GEOS should accept this bounded fixture.
        n = 12500
        ring = [[math.cos(i*2*math.pi/n), math.sin(i*2*math.pi/n)]
                for i in range(n)]
        ring.append(ring[0])
        path = self.write([self.poly(ring)])
        result, report = prepare(path, [-.5, -.5, .5, .5])
        self.assertEqual(report["coordinateCount"], n+1)
        self.assertEqual(len(result["features"]), 1)

    def test_multipart_retained(self):
        box1 = [[-2,-2],[-1,-2],[-1,-1],[-2,-1],[-2,-2]]
        box2 = [[1,1],[2,1],[2,2],[1,2],[1,1]]
        path = self.write([{"type": "MultiPolygon", "coordinates": [[box1], [box2]]}])
        result, report = prepare(path, [-3,-3,3,3])
        self.assertEqual(result["features"][0]["geometry"]["type"], "MultiPolygon")
        self.assertEqual(report["selectedCount"], 1)

    def test_self_crossing_rejected_with_no_partial_output(self):
        square = [[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]]
        bowtie = [[-1,-1],[1,1],[-1,1],[1,-1],[-1,-1]]
        source = self.write([self.poly(square), self.poly(bowtie)])
        output = self.root / "clip.geojson"
        report = self.root / "report.json"
        start_sha = hashlib.sha256(source.read_bytes()).hexdigest()
        p = subprocess.run([sys.executable, str(ROOT/"clip.py"),
            "--input",str(source),"--bbox","-1,-1,1,1",
            "--output",str(output),"--report",str(report)],
            capture_output=True,text=True,check=False)
        self.assertEqual(p.returncode,2,p.stderr)
        self.assertFalse(output.exists())
        self.assertEqual(json.loads(report.read_text())["status"],"requires_review")
        self.assertEqual(json.loads(report.read_text())["sourceSha256"],start_sha)
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),start_sha)

    def test_truncated_wfs_and_unsupported_crs_blocked(self):
        shell = [[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]]
        path = self.write([self.poly(shell)], {"totalFeatures": 3})
        with self.assertRaisesRegex(GeoReviewError, "incompleto"):
            prepare(path, [-1,-1,1,1])
        path = self.write([self.poly(shell)], {
            "crs":{"type":"name","properties":{"name":"EPSG:3857"}}})
        with self.assertRaisesRegex(GeoReviewError, "CRS"):
            prepare(path, [-1,-1,1,1])

    def test_invalid_or_open_rings_blocked(self):
        shell = [[-2,-2],[2,-2],[2,2],[-2,2]]
        path = self.write([self.poly(shell)])
        with self.assertRaisesRegex(GeoReviewError, "revisión"):
            prepare(path, [-1,-1,1,1])
        shell.append(shell[0])
        path = self.write([self.poly(shell)], {"numberMatched": "unknown"})
        with self.assertRaisesRegex(GeoReviewError, "Contador"):
            prepare(path, [-1,-1,1,1])


if __name__ == "__main__":
    unittest.main()
