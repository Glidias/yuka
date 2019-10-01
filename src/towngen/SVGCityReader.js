import { Vector3 } from "../math/Vector3.js";
import { Polygon } from "../math/Polygon.js";
import { AABB } from "../math/AABB.js";
import { LineSegment } from "../math/LineSegment.js";
import {Delaunay} from "d3-delaunay";

import cdt2d from "cdt2d";
import cleanPSLG from "clean-pslg";

import {NavMesh} from "../navigation/navmesh/NavMesh.js";
import {NavMeshUtils} from "../navigation/navmesh/NavMeshUtils.js";

import {Dijkstra} from "../graph/search/Dijkstra.js";
import { NavEdge } from "../navigation/core/NavEdge.js";

const lineSegment = new LineSegment();
const pointOnLineSegment = new Vector3();

const CITADEL_WARD_INDEX = -1;
const PLAZA_WARD_INDEX = -2;
const T_EPSILON =  1e-7;



function svgLineFromTo(from, to) {
	return "M"+from.x + ","+from.z + "L" + to.x + ","+to.z;
}

function pointInTriangle(px, py, c, b, a ) {
	return ( ( px - a[0] ) * ( b[1] - a[1] ) ) - ( ( b[0] - a[0] ) * ( py - a[1] ) ) >= 0 &&
	( ( px - b[0] ) * ( c[1] - b[1] ) ) - ( ( c[0] - b[0] ) * ( py - b[1] ) ) >= 0 &&
	( ( px - c[0] ) * ( a[1] - c[1] ) ) - ( ( a[0] - c[0] ) * ( py - c[1] ) ) >= 0;
	/*
	return ( ( p.x - a.x ) * ( b.z - a.z ) ) - ( ( b.x - a.x ) * ( p.z - a.z ) ) >= 0 &&
	( ( p.x - b.x ) * ( c.z - b.z ) ) - ( ( c.x - b.x ) * ( p.z - b.z ) ) >= 0 &&
	( ( p.x - c.x ) * ( a.z - c.z ) ) - ( ( a.x - c.x ) * ( p.z - c.z ) ) >= 0;
	*/
}

function setsIntersection(a,b) {
	return new Set(
		[...a].filter(x => b.has(x)));
}


function explode2DArray(arr) {
	let newArr = [];
	let len = arr.length;
	for (let i=0; i<len; i++) {
		let a = arr[i];
		let uLen = a.length;
		for (let u=0; u < uLen; u++) {
			newArr.push(a[u]);
		}
	}
	return newArr;
}


function get_side(a , b, c, point1, point2) {
	var s1 = a * point1.x + b * point1.z - c;
	var s1i = s1 > 0 ? 1 : s1 < 0 ? -1 : 0;

	var s2 = a * point2.x + b * point2.z - c;
	var s2i = s2 > 0 ? 1 : s2 < 0 ? -1 : 0;

	var side = s1i * s2i;
	return side < 0 ? -2 : side > 0 ? s1i : s1i == 0 ? s2i : s2i == 0 ? s1i : -2;
}

function insertIntoPathOfPoints(pt, points) {
	///*
	if (Array.isArray(pt)) {
		let len = pt.length;
		for (let i=0;i<len; i++) {
			points.push(pt[i]);
		}
	}
	else points.push(pt);
	//*/
}

function getSegmentPointsFromSVGLinePath(pathString, filteredIndices) {
	let filteredBaseCount = 0;
	let arr = (" " + pathString).split(" M ").map((s)=>{
		return s.split(" L ").map((s)=>{
			s = s.trim();
			s = s.split(",");
			let p = [parseFloat(s[0]), parseFloat(s[1])];
			//g.append(this.makeSVG("circle", {r:0.5, fill:"red", cx:p[0], cy:p[1]}));
			return p;
		});
	})
	let lastArr;
	if (filteredIndices) {
		filteredIndices.refArray = arr.slice(0);
	}
	arr = arr.filter((pts, index)=>{
		if (filteredIndices && pts.length <= 1) {
			filteredIndices.push(index);
			return false;
		}
		filteredBaseCount++;
		return pts.length >= 2;
	});
	return arr;
}

function chamferEndsOfPointsList(pointsList, radius, wrapAround) {
	let len = pointsList.length;

	wrapAround = false; // wrapAround not working, temp disabled for now, but it seems a certain case already appears to wrap around ?

	for (let i =0;i<len; i++) {
		let newArr = [];
		let curPointsList = pointsList[i];
		let p0;
		let p;
		let p1;

		let prevI = i > 0 ? i - 1 : (wrapAround ? len - 1 : -1);
		let nextI = i < len - 1 ? i + 1 : (wrapAround ? 0 : -1);
		if (prevI >= 0) {
			p = curPointsList[0];
			p1 = curPointsList[1];
			p0 = pointsList[prevI][pointsList[prevI].length-1];
			_chamferInto(newArr, p, p0, p1, radius);
		} else {
			newArr.push(curPointsList[0]);
		}

		newArr = newArr.concat(curPointsList.slice(1, curPointsList.length - 1));



		if (nextI >= 0) {
			p = curPointsList[curPointsList.length - 1];
			p0 = curPointsList[curPointsList.length - 2];
			p1 = pointsList[nextI][0];
			_chamferInto(newArr, p, p0, p1, radius);
		} else {
			newArr.push(curPointsList[curPointsList.length - 1]);
		}

		pointsList[i] = newArr;
	}
}

function _chamferInto(newArr, p, p0, p1, radius) {
	let d;
	let dx = p[0] - p0[0];
	let dy = p[1] - p0[1];

	d = Math.sqrt(dx*dx + dy*dy);
	dx /=d;
	dy /=d;
	let ex = p1[0] - p[0];
	let ey = p1[1] - p[1];
	d = Math.sqrt(ex*ex + ey*ey);
	ex /=d;
	ey /=d;
	let x = (ex + dx) * 0.5;
	let y = (ey + dy) * 0.5;
	d = Math.sqrt(x*x + y*y);
	x /=d;
	y /=d;
	newArr.push([p[0]- x*radius, p[1] - y*radius]);
	newArr.push([p[0] + x*radius, p[1] + y*radius]);
}

function chamferCornersOfPoints(arr, radius) {
	arr = arr.slice(0);
	let len = arr.length - 1;
	let i;
	let newArr = [arr[0]];
	for (i=1; i<len; i++) {
		let d;
		let p = arr[i];
		let p0 = arr[i-1];
		let p1 = arr[i+1]
		_chamferInto(newArr, p, p0, p1, radius);
	}

	newArr.push(arr[arr.length-1]);

	return newArr;
}



function weldArrayOfPoints(arr, weldThreshold) {
	weldThreshold *= weldThreshold;

	let indicesToWeld = new Map();
	let len = arr.length;
	let weldIndex = 0;
	for (let i=1; i<len; i++) {
		let p = arr[i];
		let p0 = arr[i-1];
		let dx = p[0] - p0[0];
		let dy = p[1] - p0[1];
		if (dx*dx + dy*dy <= weldThreshold) {
			if (!indicesToWeld.has(weldIndex)) indicesToWeld.set(weldIndex, [arr[weldIndex]]);
			indicesToWeld.get(weldIndex).push(p);
		} else {
			weldIndex = i;
		}
	}
	let lenReduced = 0;
	indicesToWeld.forEach((points, key)=> {
		let len = points.length;
		let x = 0;
		let y = 0;
		for (let i = 0; i< len; i++) {
			x += points[i][0];
			y += points[i][1];
		}
		x /= len;
		y /= len;

		arr.splice(arr.indexOf(points[0]), len, [x,y]);
		lenReduced += len - 1;

	});

}

function setPolygonAABB(polygon) {
	let edge = polygon.edge;
	polygon.aabb = new AABB();
	do {
		polygon.aabb.expand(edge.vertex);
		edge = edge.next;
	} while(edge !== polygon.edge);
}

function getShortestSqDistanceToEdge(polygon, point, info) {
	let edge = polygon.edge;
	let shortestDistance = Infinity;
	do {
		lineSegment.set(edge.prev.vertex, edge.vertex);
		let t = lineSegment.closestPointToPointParameter( point, true);
		lineSegment.at( t, pointOnLineSegment );
		let distance = pointOnLineSegment.squaredDistanceTo( point );
		if (distance < shortestDistance) {
			shortestDistance = distance;
			if (info) {
				info.edge = edge;
				info.t = t;
			}
		}
		edge = edge.next;
	} while(edge !== polygon.edge);
	return shortestDistance;
}

function polygonWithinDistanceOf(polygon, point, dist) {
	dist *= dist;
	let edge = polygon.edge;

	if (polygon.aabb && !polygon.aabb.containsPoint(point) ) {
		return false;
	}

	do {
		lineSegment.set(edge.prev.vertex, edge.vertex);
		let t = lineSegment.closestPointToPointParameter( point, true);
		lineSegment.at( t, pointOnLineSegment );
		let distance = pointOnLineSegment.squaredDistanceTo( point );
		if (distance <= dist) {
			return true;
		}
		edge = edge.next;
	} while(edge !== polygon.edge);
	return false;
}

function overlapsFaces2D(myFace, face) {
	var v2 = null;
	var w2;
	var v = null;
	var w;

	var a;
	var b;
	var c;

	var lastVertex;
	var lastVertex2;

	w = myFace.edge;

	lastVertex = myFace.edge.prev.vertex;

	w = face.edge;
	lastVertex2 = face.edge.prev.vertex;

	v = lastVertex;
	w = myFace.edge;
	do {
		var v0 = v;
		v = w.vertex;
		var v1 = w.next.vertex;

		v2 = lastVertex2;
		w2 = face.edge;
		do {
			var v2_0 = v2;
			v2 = w2.vertex;
			var v2_1 =  w2.next.vertex;

			a = -(v2.z - (v.z));
			b = (v2.x - v.x);	// the other guy's one have this as negative
			c = a * v.x + b * (v.z);
			var sideA = get_side(a, b, c, v0, v1);
			if (sideA < -1) {
				w2 = w2.next;
				continue;
			}
			var sideB = get_side(a, b, c, v2_0, v2_1);
			if (sideB < -1) {

				w2 = w2.next;
				continue;
			}
			if (sideA * sideB < 0) {
				return false;
			}

			w2 = w2.next;
		} while (w2 !== face.edge)

		w = w.next;
	} while (w !== myFace.edge)

	return true;
}

function mergeCellsNewHull(cellA, cellB) {
	let del =  Delaunay.from(cellB ? cellA.concat(cellB) : cellA);
	return pointsFromDelHull(del);
}

function pointsFromDelHull(del) {
	let points = del.points;
	let hull = del.hull;
	let arr = [];
	let len = hull.length;
	for (let i=0; i<len; i++) {
		let baseI = (hull[i] << 1);
		arr.push([points[baseI],points[baseI+1]]);
	}
	return arr;
}

function isOverlappingCells(cellA, cellB) {
	return overlapsFaces2D(cellToPolygon(cellA) , cellToPolygon(cellB));
}

function getSignedAreaCell(cell) {
	var areaAccum = 0;
	let p = cell[0];
	let len = cell.length - 1;
	let x1 = p[0];
	let y1 = p[1];

	for (let i=0; i<len; i++) {
		let i2 = i < len - 1 ? i + 1 : 0;
		p = cell[i];
		let x2 = p[0];
		let y2 = p[1];
		p = cell[i2];
		let x3 = p[0];
		let y3 = p[1];
		areaAccum += ( x3 - x1 ) * ( y2 - y1 )  -  ( x2 - x1 ) * ( y3 - y1 )
	}
	return areaAccum;
}

function renderTrianglesOf(del) {
	let val = "";
	for ( let i = 0, l = del.triangles.length/3; i < l; i ++ ) {
		val += del.renderTriangle(i);
	}
	return val;
}

function collectWardBuildings(collector, neighborhoods) {
	for ( let i = 0, l = neighborhoods.length; i < l; i ++ ) {
		let nhood = neighborhoods[i];
		for ( let b = 0, bLen = nhood.length; b < bLen; b ++ ) {
			collectBuildingHole(collector, nhood[b]);
		}
	}
}

function collectBuildingHole(collector, buildingLen) {
	let startHullEdgeCount = collector.length;
	let hullEdgeCount = startHullEdgeCount;
	let len = startHullEdgeCount + buildingLen;
	for (let i=startHullEdgeCount; i<len; i++) {
		if (i < len - 1) {
			collector.push([hullEdgeCount, ++hullEdgeCount]);
		} else {
			collector.push([hullEdgeCount++, startHullEdgeCount]);
		}
	}
}

function polygonToCell(polygon) {
	let edge = polygon.edge;
	let arr = [];

	do {
		arr.push([edge.vertex.x, edge.vertex.z]);
		edge = edge.next;
	} while (edge !== polygon.edge);
	return arr;
}


function cellToPolygon(cell) {
	let poly = new Polygon();
	poly.fromContour(cell.map((p)=>{return new Vector3(p[0], 0, p[1])}));
	return poly;
}

function polygonSVGString(polygon) {
	let edge = polygon.edge;
	let str = "";
	str += "M"+edge.vertex.x+","+edge.vertex.z + " ";
	edge = edge.next;
	do {
		str += "L"+edge.vertex.x+","+edge.vertex.z + " ";
		edge = edge.next;
	} while (edge !== polygon.edge);
	str += "Z";

	return str;
}

function lineSegmentSVGStr(v1, v2) {
	let str = "M"+v1.x+","+v1.z + " ";
	str += "L"+v2.x+","+v2.z + " ";
	return str;
}

function edgeSVGString(edge) {
	let str = "M"+edge.prev.vertex.x+","+edge.prev.vertex.z + " ";
	str += "L"+edge.vertex.x+","+edge.vertex.z + " ";
	return str;
}

function cellSVGString(cell) {
	let len = cell.length;
	let str = "";
	let c = cell[0];

	str += "M"+c[0]+","+c[1] + " ";
	for (let i=1; i<len; i++) {
		c = cell[i];
		str += "L"+c[0]+","+c[1] + " ";
	}
	str += "Z";
	return str;
}

function svgPolyStrToContour(str) {
	return str.split(" ").map((s) => {
		s = s.split(",");
		return new Vector3(parseFloat(s[0]), 0, parseFloat(s[1]));
	});
}

function svgPolyStrToPoints(str) {
	return str.split(" ").map((s) => {
		s = s.split(",");
		return [parseFloat(s[0]), parseFloat(s[1])];
	});
}


function getBBoxCenter(rect) {
	return new Vector3(rect.x + rect.width*.5, 0, rect.y + rect.height*.5);
}

function triSVGString(vertSoup, tri) {
	return `M${vertSoup[tri[2]][0]},${vertSoup[tri[2]][1]} L${vertSoup[tri[1]][0]},${vertSoup[tri[1]][1]} L${vertSoup[tri[0]][0]},${vertSoup[tri[0]][1]} Z`;
}
function getTriPolygon(vertSoup, tri) {
	let poly = new Polygon().fromContour([
		new Vector3(vertSoup[tri[2]][0], 0, vertSoup[tri[2]][1]),
		new Vector3(vertSoup[tri[1]][0], 0, vertSoup[tri[1]][1]),
		new Vector3(vertSoup[tri[0]][0], 0, vertSoup[tri[0]][1])
	]);
	return poly;
}

function collinear(p1, p2, p3, threshold) {
	let x1 = p1[0];
	let y1 = p1[1];
	let x2 =  p2[0];
	let y2 = p2[1];
	let x3 = p3[0];
	let y3 =  p3[1];
	let collinear0 = x1 * (y2 - y3) +   x2 * (y3 - y1) +   x3 * (y1 - y2) <= threshold;
	//let collinear0 = ( x3 - x1 ) * ( y2 - y1 )  -  ( x2 - x1 ) * ( y3 - y1 ) <= threshold;
	return collinear0;
}

const samplePt = new Vector3();

/**
 * Analyses city SVG files generated from https://watabou.itch.io/medieval-fantasy-city-generator .
 * Acts as a springboard to generate street map, navigation graphs, etc. from SVG city layout, which is useful for conversion to 3D visualisations and games.
 *
 * Can do the following:
 * - Retrieves Wards: their neighborhoods, and building shapes within neighbourhoods for easy extrusion, among other things
 *  - Retrieves out shape polygon geometries of City/Citadel Wall and Bastions
 *  -Identify Wards (or any arbituary position) that are within the boundaries of City Wall
 *  - Retrieves Floor navmeshes from individual Wards, or their neighbourhoods, or of entire world for easy extrusion, or gameplay navigation, etc.
 *
 * - Retrieves Streetmap Navmesh (Or Highway-only navmesh Or Road-only Navmesh) for easy extrusion
 * - Able to divide out Streetmap Navmesh regions into seperate unique road sections

 * - Retrives highway exits points
 * - Retrieves Citadel building blocks shape
 * - Retrieves plaza region points and landmark
 * - Calculate ward-distances and centroid-to-point euclidean distances of Wards from Citadel and City Wall respectively
 *
 * - Create insetted navmesh
 *
 * Future considerations:
 * - Retrieves BSP tree from Ward of all its buildings, to allow for optimized near-hit first raycasting in-game on large maps.
 * - Adjust wards
*/
class SVGCityReader {

	constructor() {
		this.wards = [];
		this.citadel = null;

		// path
		this.selectorWards = "g[fill='#99948A'][stroke='#1A1917']";


		// Higher specificiality, will remove from this.selectorWards

		// if same, will attempt to discriminate between them with Citadel being the largest (if got citadel), or closest to center landmark guess
		this.selectorLandmark = "g[fill-rule='nonzero'][fill='#99948A'][stroke='#1A1917']";
		this.selectorCitadel = "g[fill-rule='nonzero'][fill='#99948A'][stroke='#1A1917']";

		this.selectorFarmhouses = "g[fill-rule='nonzero'][stroke='#99948A'][stroke-linecap='butt']";

		this.selectorRoads = "g[fill=none]"  // polyline



		// stroke-width="1.9"
		this.selectorCityWallPath = "g > path[fill='none'][stroke='#1A1917'][stroke-linejoin='round'][stroke-linecap='round']";
		this.findCityWallByCitadel = false;
		// ----------

		// General epsilon settings
		this.collinearThreshold = 0.001;
		this.collinearAreaThreshold = 0.01;
		this.sqWeldDistThreshold = 0.01;


		this.subSelectorEntranceLines = "g > line";

		// City wall settings
		this.cityWallPillarByAABBCenter = true;
		this.wallPillarRadius = 1.3;

		this.entranceWallPillarRadius = 0;
		this.entCitadelPillarRadiusScale = 1.4;
		this.chamferForWallPillars = true;
		this.chamferForEntranceWall = true;
		this.weldWallPathThreshold = 1;

		// Road detection settings
		this.maxRoadEdgeLength = 8; //8;
		this.highwayMinWidth = 1.8;
		this.highwayMaxWidth = 6.2;
		this.optimalHighwayThickness = 2.0;
		this.streetIdPrecision = 0;
		//this.optimalStreetThickness = 2.0;

		// Staircase/ramp settings
		this.rampLength = 2.4;
		this.rampLanding = 0.72;
		this.rampWidth = 0.75;
		this.rampMaxGradient = 0.83; // 40deg //0.9; // 42deg

		// Upper ward settings
		this.minPillarRadius = 1.7;
		this.maxPillarRadius = 3;
		this.pillarSpacing = 0.5;
		this.pillarStrengthRatio = 2.4;
		this.omitUpperWardsOutliers = true;
		this.maxBridgeDistance = 35;
		this.maxBridgeCheckpointRatio = 2;

		this.fullUpperWardCollideCheck = true;

		this.linkBridgesToHighways = true;

		// bridge anti-filters
		this.noBridgeAcrossCityWallRamp = true;
		this.noBridgeAcrossCityWall = true;

		this.supportPillarBlockLevel = 2;

	}

	extrudePathOfPoints(points, radius, loop, cap, newPoints, _isLooping) {
		if (!newPoints) newPoints = [];
		if (_isLooping === true) {
			points = points.slice(0);
			points.reverse();
		}
		let len = points.length;
		let capFactor = cap ? 1 : 0;

		capFactor = 0; // tmep for now, caps dont work...unsure why

		for (let i=1; i<len; i++) {
			let p = points[i];
			let p0 = points[i-1];
			let p1 = i < len - 1 ? points[i+1] : null;
			let ex = p[0] - p0[0];
			let ey = p[1] - p0[1];
			let enx = ey;
			let eny = -ex;
			let nx;
			let ny;
			let d;
			let x = p[0];
			let y = p[1];
			if (p1 !== null) {
				let dx = p[0] - p0[0];
				let dy = p[1] - p0[1];
				d = Math.sqrt(dx*dx + dy*dy);
				dx /= d;
				dy /= d;
				let dnx = ey;
				let dny = -ex;
				d = Math.sqrt(dnx*dnx + dny*dny);
				dnx /=d;
				dny /=d;
				nx = (dnx + enx) * 0.5;
				ny = (dny + eny) * 0.5;
				d = Math.sqrt(nx*nx + ny*ny);
				nx /=d;
				ny /=d;
			} else {
				nx = enx;
				ny = eny;
				d = Math.sqrt(nx*nx + ny*ny);
				nx /= d;
				ny /= d;
				// extend end cap for p1 by radius
				d = Math.sqrt(ex*ex * ey*ey);
				ex /=d;
				ey /=d;
				x+= ex * radius * capFactor;
				y+= ey * radius * capFactor;
			}
			//console.log(d + "  vs "+Math.sqrt(nx*nx * ny*ny));
			d = Math.sqrt(enx*enx + eny*eny);
			enx /=d;
			eny /=d;

			// miter corner projection for radius outward
			let sc = enx * radius * nx + eny * radius * ny;

			if (i === 1) { // start cap for p0
				// extended start cap for p0 by radius
				d = Math.sqrt(ex*ex * ey*ey);
				ex /=d;
				ey /=d;
				ex *= capFactor;
				ey *= capFactor;
				newPoints.push([(p0[0]- ex * radius) + nx * radius, (p0[1] - ey * radius) + ny * radius]);
			}


			newPoints.push([x + nx * radius * sc, y + ny * radius * sc]);
		}

		if (loop) return this.extrudePathOfPoints(points, radius, false, cap, newPoints, true);

		return newPoints;
	}


	hitWardAtPoint3D(pt) {
		let wards = this.wards;
		for ( let i = 0, l = wards.length; i < l; i ++ ) {
			let w = wards[i];
			let aabb = w.aabb;
			if (pt.x >= aabb.min.x && pt.z >= aabb.min.z && pt.x <= aabb.max.x && pt.z <= aabb.max.z ) {
				if (w.polygon.contains(pt)) {
					return w;
				}
			}
		}
		return null;
	}

	/**
	 *
	 * @param {Textual contents of SVG} svgContents
	 * @param {HtmlElement|String} previewContainer Any DOM container or selector to display SVG
	 */
	parse(svgContents, previewContainer) {
		let svj = $(svgContents);
		let map = svj.find("#map");
		this.svgWidth = parseInt(svj.attr("width"));
		this.svgHeight = parseInt(svj.attr("height"));
		this.map = map;


		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("path", {stroke:"orange", "stroke-width":1, d: svgLineFromTo(new Vector3(-this.svgWidth*.5, 0, -this.svgHeight*.5), new Vector3(-this.svgWidth*.5 + this.maxBridgeDistance,0,-this.svgHeight*.5)) }));

		var tempContainer = null;
		if (previewContainer) {
			$(previewContainer).append(svj);
			window.document.body.style.zoom = "300%";
		} else {
			tempContainer = $(document.body).append($("<div></div>"));
		}



		let dummySelector = $("<g></g>");
		if (this.selectorRoads) {
			this.selectorRoads = map.children(this.selectorRoads);

		}
		if (this.selectorFarmhouses) {
			this.selectorFarmhouses = map.children(this.selectorFarmhouses);

		}
		if (this.selectorCitadel) {
			this.selectorCitadel = map.children(this.selectorCitadel);


		}
		if (this.selectorLandmark) {
			this.selectorLandmark = map.children(this.selectorLandmark);
		}

		if (this.selectorCityWallPath) {
			this.selectorCityWallPath = map.find(this.selectorCityWallPath);

			if (this.selectorCityWallPath.length > 1 ) {
				if (this.findCityWallByCitadel && this.selectorCitadel && this.selectorCitadel.length) {
					// consider find by citadel location
				} else {	// differentate by size
					// or issit alwas the first one by convention?
					if (this.selectorCityWallPath.length > 2) {
						alert("TOo many matches found for selectorCityWallPath!! " + this.selectorCityWallPath.length);
					}
					let a = this.selectorCityWallPath.parent()[0].getBBox();
					let b = this.selectorCityWallPath.parent()[1].getBBox();
					let cityWallIndex = a.width* a.height >= b.width*b.height ? 0 : 1;
					let citadelWallIndex = cityWallIndex === 0 ? 1 : 0;

					this.selectorCitadelWall = $(this.selectorCityWallPath[citadelWallIndex]).parent();
					this.selectorCityWallPath = $(this.selectorCityWallPath[cityWallIndex]);
					this.selectorCityWall = this.selectorCityWallPath.parent();

				}
			} else {
				this.selectorCityWall =this.selectorCityWallPath.parent();
			}

			if (this.selectorCityWall.length) {
				this.parseCityWalls(this.selectorCityWall, this.selectorCityWallPath, this.selectorCitadelWall);
			} else {
				console.warn("Could not find City/Citadel wall selector!");
			}

		}

		if (this.selectorWards) {
			this.selectorWards = map.children(this.selectorWards);
			if (this.selectorCitadel) this.selectorWards = this.selectorWards.not(this.selectorCitadel);
			if (this.selectorLandmark) this.selectorWards = this.selectorWards.not(this.selectorLandmark);
			//if (this.selectorRoads) this.selectorWards = this.selectorWards.not(this.selectorRoads);
			//if (this.selectorFarmhouses) this.selectorWards = this.selectorWards.not(this.selectorFarmhouses);

			this.parseWards(this.selectorWards);

			this.testSubdivideBuilding(this.wards[14].neighborhoodPts[0][0]);
		}


		/*
		if (this.selectorLandmark) {
			map.children(this.selectorLandmark);
		}

		if (this.selectorCitadel) {
			map.children(this.selectorCitadel);
		}
		*/

		if (tempContainer !== null) {
			tempContainer.remove();
		}

	}

	testSubdivideBuilding(building) {
		building = building.slice(0).reverse(); // non-cleamature (svg outlines appears to be not clockwise for buildings?)
		let poly = cellToPolygon(building);
		/* //
		if (!poly.convex(true)) {
			console.error("NOT CCW");
		}
		*/
		let edgeCount = 0;
		let edge = poly.edge;
		let edges = [];
		do {
			edges.push(edge);
			edgeCount++;
			edge = edge.next;
			// if (edgeCount === 4) g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:edge.vertex.x, cy:edge.vertex.z}));
		} while (edge !== poly.edge);

		//edges[Math.floor(Math.random() * edgeCount)]


		this.carveRamps(edges[2], true, Infinity);
	}

	/**
	 * Carve out flights of zig-zagging ramps along a Polygon's Edge on available space provided by polygon.
	 * For simplicity, Polygon is assumed to be a flat top surface on x,z plane that defines the available floor space.
	 * @param {} edgeAlong
	 * @param {} alignTailEnd
	 * @param {*} maxFlights
	 */
	carveRamps(edgeAlong, alignTailEnd, maxFlights) {
		var svg = $(this.makeSVG("g", {}));
		this.map.append(svg, {});
		svg.append(this.makeSVG("path", {stroke:"yellow", fill:"none", "stroke-width":0.55, d: edgeSVGString(edgeAlong)}));
		var polygon = edgeAlong.polygon;

		const T = this.rampLanding * 2 + this.rampLength + T_EPSILON;
		const addFlightDist = this.rampLanding + this.rampLength;

		let dx = edgeAlong.vertex.x - edgeAlong.prev.vertex.x;
		let dz = edgeAlong.vertex.z - edgeAlong.prev.vertex.z;

		if (alignTailEnd) svg.append(this.makeSVG("path", {stroke:"green", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.prev.vertex,  new Vector3().copy(edgeAlong.prev.vertex).add(new Vector3().subVectors(edgeAlong.vertex, edgeAlong.prev.vertex).normalize().multiplyScalar(addFlightDist))) }));
		else svg.append(this.makeSVG("path", {stroke:"green", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.vertex,  new Vector3().copy(edgeAlong.vertex).add(new Vector3().subVectors(edgeAlong.prev.vertex, edgeAlong.vertex).normalize().multiplyScalar(addFlightDist))) }));

		let pter;
		if (alignTailEnd) svg.append(this.makeSVG("path", {stroke:"white", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.prev.vertex,  pter = new Vector3().copy(edgeAlong.prev.vertex).add(new Vector3().subVectors(edgeAlong.vertex, edgeAlong.prev.vertex).normalize().multiplyScalar(this.rampLanding))) }));
		else svg.append(this.makeSVG("path", {stroke:"white", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.vertex,  pter = new Vector3().copy(edgeAlong.vertex).add(new Vector3().subVectors(edgeAlong.prev.vertex, edgeAlong.vertex).normalize().multiplyScalar(this.rampLanding))) }));

		let dAccum = 0;
		let dStart = -1;

		let D = Math.sqrt(dx * dx + dz * dz);
		let dClearance = D;
		let nx = dz;
		let nz = -dx;
		let d = Math.sqrt(nx*nx + nz*nz);
		nx /=d;
		nz /=d;
		const NX = nx;
		const NZ = nz;

		let gradients = [];
		let orderedEdges = [];
		let edge = edgeAlong.next;
		edgeAlong.offset = edgeAlong.vertex.x * nx + edgeAlong.vertex.z * nz;
		edgeAlong.prev.offset = edgeAlong.offset;
		//edgeAlong.prev.offset = edgeAlong.prev.vertex.x * nx + edgeAlong.prev.vertex.z * nz;
		//console.log(edgeAlong.offset + " === " + edgeAlong.prev.offset + " :: "+ (edgeAlong.offset === edgeAlong.prev.offset));
		let i;
		do {
			edge.offset = edge.vertex.x * nx + edge.vertex.z * nz;
			orderedEdges.push(edge);
			edge = edge.next;
		} while(edge !== edgeAlong.prev);

		// default sort
		orderedEdges.sort((a,b)=>{return a.offset - b.offset});
		//console.log(edgeAlong.offset);
		//console.log(orderedEdges);

		// Scan across polygon to determine amount and bounds of space available to place ramps along edgeAlong direction
		let len = orderedEdges.length;
		edge = edgeAlong.next;
		let g1 = new Vector3(); // headside gradient
		let g2 = new Vector3(); // tailside gradient
		let hUnit = new Vector3().subVectors(edgeAlong.vertex, edgeAlong.prev.vertex);
		hUnit.normalize();
		let tUnit = new Vector3(-hUnit.x,  -hUnit.y,  -hUnit.z);

		let fromHeadside;
		let d1;
		let d2;
		let g;
		//g =  gradient along tailside +  gradient along headside
		//headGrad or tailGrad respectively = v.dot(headTailUnitVector) / (v.offset - prevV.offset)
		for (i=0; i<len; i++) {
			if (orderedEdges[i] !== edge) {  // orderedEdges[i] is found on tail side
				g1.subVectors(edge.vertex, edge.prev.vertex);
				d1 = edge.offset - edge.prev.offset;
				g2.subVectors(orderedEdges[i].vertex, orderedEdges[i].next.vertex);
				d2 = orderedEdges[i].offset -orderedEdges[i].next.offset;
				fromHeadside = false;
			} else { // orderedEdges[i]=== edge, ie. is found on head side
				g1.subVectors(edge.vertex, edge.prev.vertex);
				d1 = edge.offset - edge.prev.offset;
				edge = edge.next;
				// find next g2 on tail side

				for (g = i+1; g< len ; g++) {
					if (orderedEdges[g] !== edge) break;
				}
				if ( g < len) {
					// console.log(vertex on opposite tail side case)
					g2.subVectors(orderedEdges[g].prev.vertex, orderedEdges[g].vertex);
					d2 = orderedEdges[g].prev.offset -orderedEdges[g].offset;
				} else {
					// console.log("end vertex case");
					g = len - 1;
					g2.subVectors(orderedEdges[g].vertex, orderedEdges[g].next.vertex);
					d2 = orderedEdges[g].offset -orderedEdges[g].next.offset;
				}
				fromHeadside = true;
			}

			d = orderedEdges[i].offset - (i >= 1 ? orderedEdges[i-1].offset : edgeAlong.offset);
			if (d < 0) console.error("d should be positive magnitude!");
			if (d === 0) {
				gradients.push(null);
				continue; // no gradient found along zero offset distance
			}

			if (d1 < 0) console.error("d1 should be positive magnitude!");
			if (d2 < 0) console.error("d2 should be positive magnitude!");
			let g1grad = g1.dot(hUnit) / d1;
			let g2grad = g2.dot(tUnit) / d2;
			gradients.push([g1grad, g2grad, fromHeadside]);
			g = g1grad + g2grad;

			// minMaxD >= (T - D)/g
			// minima maxima d, where T is minimum required target distance for placing a single flight of ramp, g is overall gradient on both ends,
			// and D is current slice length at current i junctio point
			let mmd;
			if (T <= D) { // already met clearance
				if (dStart < 0) dStart = 0;
				if (g >= 0) {
					console.log("for maxima: gradient>=0 will always meet space requirements for entire d. Can step add full d.");
					dAccum += d
				} else {
					console.log("for maxima: gradient < 0 may not meet space requirements for entire d, if it doesnt, can early exit out of full loop with remaining d");
					mmd = (T-D)/g;
					console.log("mmd:"+mmd + " :has More:"+(mmd>=d));
					if (mmd <= 0) {
						break;	// no more gradient
					}
					if (mmd >= d) { // there may be more
						dAccum += d;
					} else {
						dAccum += mmd; // reached end of closed gradient
						break;
					}

				}
			} else {  // have not met clearance
				if (g >= 0) {
					console.log("for minima: gradient>=0 may yet to meet space requirements for startD");
					mmd = (T-D)/g;
					console.log("mmd:"+mmd + " :MET:"+(mmd<=d));
					if (mmd <= d) {
						if (dStart < 0) dStart = mmd;
						dAccum += (d - mmd);
					}
				} else {
					console.log("for minima: gradient < 0 will never meet space requirements for remaining entire d. Can early exit out full loop!!")
					break;
				}
			}

			// update D to match new interval
			D += g * d;

			console.log(">d:"+d + ", "+fromHeadside + "," + d1 + ", " +  d2 + " :: "  +g1grad + " + " + g2grad + " = " + (g1grad+g2grad) + " D:"+D);

			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: orderedEdges[i].vertex.x, cy: orderedEdges[i].vertex.z}));
		}

		svg.append(this.makeSVG("path", {stroke:"pink", fill:"none", "stroke-width":0.14, d: lineSegmentSVGStr(pter = new Vector3().copy(edgeAlong.prev.vertex).add(edgeAlong.vertex).multiplyScalar(0.5).add(new Vector3(NX*dStart,0,NZ*dStart)), new Vector3(pter.x+NX*dAccum, 0, pter.z+NZ*dAccum)  ) }));


		if (dStart < 0 || dAccum < this.highwayMinWidth) return null;

		// Calculate columns+flights, and remaining clipped polygon

		// walk up along span of potential ramp columns for contour
		let walkD = 0; // distance walked so far
		let maxColumns = Math.floor(dAccum / this.rampWidth);
		let totalFlights = 0;

		let dLimit = dStart + maxColumns * this.rampWidth - this.rampWidth;
		i = 0;
		let rampLayDir = alignTailEnd ? hUnit : tUnit;

		// this.rampLength;
		// this.rampLanding;
		// this.rampWidth;
		// this.rampMaxGradient; // to consider later for custom height settings

		let columns = [];

		// onlu required for contours tracing
		let headV = new Vector3().copy(edgeAlong.vertex);
		let tailV = new Vector3().copy(edgeAlong.prev.vertex);
		let colContoursHead = [];
		let colContoursTail = [];

		const columnLayDir = new Vector3(NX, 0, NZ);
		const columnLayOffsetVec = new Vector3(NX, 0, NZ).multiplyScalar(this.rampWidth);
		const landingOffsetVec = new Vector3(rampLayDir.x, 0, rampLayDir.z).multiplyScalar(this.rampLanding);
		const dummyVector = new Vector3();

		while (walkD < dLimit) {
			d = orderedEdges[i].offset - (i >= 1 ? orderedEdges[i-1].offset : edgeAlong.offset);
			if (orderedEdges[i].offset - edgeAlong.offset <= dStart || d === 0) {
				walkD += d;
				i++;
				headV.x += gradients[i][0] * d * hUnit.x + d * NX;
				headV.z += gradients[i][0] * d * hUnit.z + d * NZ;
				tailV.x += gradients[i][1] * d * tUnit.x + d * NX;
				tailV.z += gradients[i][1] * d * tUnit.z + d * NZ;
				dClearance += (gradients[i][0] + gradients[i][1]) * d;
				continue;
			}



			if (dStart > walkD) {
				g = dStart - walkD;
				//walkD += g;
				walkD = dStart;
				headV.x += gradients[i][0] * g * hUnit.x + g * NX;
				headV.z += gradients[i][0] * g * hUnit.z + g * NZ;
				tailV.x += gradients[i][1] * g * tUnit.x + g * NX;
				tailV.z += gradients[i][1] * g * tUnit.z + g * NZ;
				dClearance += (gradients[i][0] + gradients[i][1]) * g;
				console.log("Jump starrting:"+dClearance);
			}


			let lenOffset = edgeAlong.offset + walkD + this.rampWidth;

			let rampDistLeft = this.rampWidth;
			let curClearance = dClearance;

			let c = 0;
			let c2 = 0;
			// start vertices for column
			colContoursHead[c++] = headV.clone();
			colContoursTail[c2++] = tailV.clone();

			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: headV.x, cy: headV.z}));
			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: tailV.x, cy: tailV.z}));
			while(orderedEdges[i].offset < lenOffset) { // if end bound of ramp exceeds current orderedEdges points
				// pick up any inbetween contour for head/tail end respectively
				g = orderedEdges[i].offset - edgeAlong.offset - walkD;
				rampDistLeft -= g;
				walkD += g;
				headV.x += gradients[i][0] * g * hUnit.x + g * NX;
				headV.z += gradients[i][0] * g * hUnit.z + g * NZ;
				tailV.x += gradients[i][1] * g * tUnit.x + g * NX;
				tailV.z += gradients[i][1] * g * tUnit.z + g * NZ;
				dClearance += (gradients[i][0] + gradients[i][1]) * g;
				fromHeadside = gradients[i][2];
				if (fromHeadside) {
					colContoursHead[c++] = headV.clone();
					//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: headV.x, cy: headV.z}));
				} else {
					colContoursTail[c2++] = tailV.clone();
					//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: tailV.x, cy: tailV.z}));
				}
				i++;
					console.log("IN BETWEEN");
			}



			walkD += rampDistLeft;
			dClearance += (gradients[i][0] + gradients[i][1]) * rampDistLeft;
			headV.x += gradients[i][0] * rampDistLeft * hUnit.x + rampDistLeft * NX;
			headV.z += gradients[i][0] * rampDistLeft * hUnit.z + rampDistLeft * NZ;
			tailV.x += gradients[i][1] * rampDistLeft * tUnit.x + rampDistLeft * NX;
			tailV.z += gradients[i][1] * rampDistLeft * tUnit.z + rampDistLeft * NZ;

			let useLatterEdge = false;
			// end intersection
			if (dClearance < curClearance) {
				curClearance = dClearance;
				useLatterEdge = true;
				//svg.append(this.makeSVG("circle", {stroke:"red", fill:"red", r:0.15, cx: (alignTailEnd ? tailV : headV).x, cy: (alignTailEnd ? tailV : headV).z}));
			}
			// else {
				//svg.append(this.makeSVG("circle", {stroke:"green", fill:"green", r:0.15, cx: (alignTailEnd ? tailV : headV).x, cy: (alignTailEnd ? tailV : headV).z}));
			//}

			// carve out polygon for slice

			//console.log(curClearance);
			let numFlightsForCol = Math.floor((curClearance - this.rampLanding)/addFlightDist);
			totalFlights += numFlightsForCol;


			columns.push({flights:numFlightsForCol}); // column built;

			///*
			if (useLatterEdge) {
				colContoursHead[c-1].copy(headV).sub(columnLayOffsetVec);
				colContoursTail[c2-1].copy(tailV).sub(columnLayOffsetVec);
				colContoursHead[c++] = headV.clone();
				colContoursTail[c2++] = tailV.clone();
			} else {
				colContoursHead[c] = colContoursHead[c-1].clone().add(columnLayOffsetVec);
				colContoursTail[c2] = colContoursTail[c2-1].clone().add(columnLayOffsetVec);
				c++;
				c2++;
			}

			dummyVector.copy(rampLayDir).multiplyScalar((addFlightDist * numFlightsForCol - this.rampLanding));

			if (alignTailEnd) {
				colContoursTail[c2-1].add(landingOffsetVec);
				colContoursTail[c2-2].add(landingOffsetVec);

				colContoursHead[c-1].copy(colContoursTail[c2-1]).add(dummyVector);
				colContoursHead[c-2].copy(colContoursTail[c2-2]).add(dummyVector);

			} else {
				colContoursHead[c-1].add(landingOffsetVec);
				colContoursHead[c-2].add(landingOffsetVec);

				colContoursTail[c2-1].copy(colContoursHead[c-1]).add(dummyVector);
				colContoursTail[c2-2].copy(colContoursHead[c-2]).add(dummyVector);
				//dummyVector.copy(rampLayDir).multiplyScalar((addFlightDist * numFlightsForCol - this.rampLanding));
				//colContoursTail[c-1].copy(colContoursTail[c2-1]).add(dummyVector);
				//colContoursHead[c-2].copy(colContoursTail[c2-2]).add(dummyVector);
			}

			//*/

			//colContoursHead[c++] = headV.clone();
			//colContoursTail[c2++] = tailV.clone();


			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: headV.x, cy: headV.z}));
			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: tailV.x, cy: tailV.z}));

			colContoursHead.length = c;
			colContoursTail.length = c2;

			//console.log(colContoursHead+ " :: "+colContoursTail)
			pter = new Polygon().fromContour(colContoursHead.concat(colContoursTail.reverse()));
			//console.log(pter.convex(true));
			svg.append(this.makeSVG("path", {stroke:"orange", fill:"none", "stroke-width":0.14, d: polygonSVGString(pter)  }));
			// last ending vertices for column



			if (columns.length >= maxFlights) {
				break;
			}
		}

		// based on number of columsn, get remaining clip polygon from headV and tailV
		// dStart, dStart + this.rampWidth * columns.length

		/*
		For each column
		Landing polygon top
		Ramp polygon (if numOfFlights > 1, add in preceding landing before each non-first ramp,)
		Landing polygon bottom
		*/
		// each column slice definition (number of flights, starting from/to column edges position from which to start laying flights of ramps)
		// totalFlights, columns

		let result = {
			dStart: dStart,
			dAccum: dAccum,
			maxColumns: maxColumns,
			totalFlights: totalFlights,
			rampLayDir: rampLayDir,
			columnLayDir: columnLayDir,
			columns: columns,
		};

		console.log("FINAL RESULT:"+dStart + " :: "+dAccum, result);
		return result;
	}


	makeSVG(tag, attrs) {
		var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
		for (var k in attrs)
			el.setAttribute(k, attrs[k]);
		return el;
	}

	getCDTObjFromPointsList(pointsList, cleanup, params, processPointsMethod) {
		let vertices = params.vertices ? params.vertices.slice(0) : [];
		let edges = params.edges ? params.edges.slice(0) : [];
		pointsList.forEach((points, index)=> {
			let baseCount = vertices.length;

			if (processPointsMethod) points = processPointsMethod(points, index);
			let count = baseCount;

			points.forEach((p, index)=> {
				if (index >= 1) edges.push([count-1, count]);
				if (index === points.length - 1) edges.push([count, baseCount]);
				count++;
				vertices.push(p);
			});
		});

		if (cleanup) {
			if (this.citadelWallSegments.length > 0) {
				// go through all edges, if 1 of the edges have
				// look for points of citaldel wall edges
			}
			cleanPSLG(vertices, edges);
		}

		let cdt = cdt2d(vertices, edges, (params ? params : {exterior:true}));

		return {vertices:vertices, edges:edges, cdt:cdt};
	}

	parseCityWalls(jSel, jSelPath, jSelCitadelWall) {
		// assumed already arranged seperately in anticlockwise order
		let jEntrances = jSel.children("g");
		let jPillars = jSel.children("polygon");


		// previewing
		let g = $(this.makeSVG("g", {}));
		this.map.append(g);


		let pathString = jSelPath.attr("d");
		let pathRadius = jSelPath.attr("stroke-width") ? parseFloat(jSelPath.attr("stroke-width"))* 0.5 : 1;

		this.cityWallPillars = [];
		this.cityWallPillarPoints = [];

		this.cityWallEntrancePoints = [];
		let filteredAtCitadel = [];
		this.cityWallSegments = getSegmentPointsFromSVGLinePath(pathString, filteredAtCitadel, this.weldWallPathThreshold);

		if (filteredAtCitadel.length !== 0) {
			//console.log(filteredAtCitadel);
			let f1 = filteredAtCitadel[0];
			let f2 = filteredAtCitadel[1];

			//s	this.cityWallSegments = filteredAtCitadel.refArray.slice(f1+1, f2  ).concat(filteredAtCitadel.refArray.slice(f2+1));

			// not sure why need to add another +1
			this.cityWallSegments =filteredAtCitadel.refArray.slice(f2 + 1).concat(filteredAtCitadel.refArray.slice(f1+1+1, f2  ));
			//	console.log(this.cityWallSegments);

			//this.cityWallSegments = this.cityWallSegments.slice(f2-1).concat(this.cityWallSegments.slice(1, f2-1));
			//console.log(this.cityWallSegments.length);
		}

		if (this.chamferForWallPillars) {
			this.cityWallSegments.forEach((value, index, arr)=>{
				arr[index] = chamferCornersOfPoints(value, this.wallPillarRadius);
			});
		}

		if (this.chamferForEntranceWall) {
			chamferEndsOfPointsList(this.cityWallSegments, this.entranceWallPillarRadius ? this.entranceWallPillarRadius : this.wallPillarRadius*this.entCitadelPillarRadiusScale);
		}


		this.cityWallSegmentsUpper = [explode2DArray(this.cityWallSegments)]; // todo: break and rearrange from start/end citadel
	//	let ref = this.cityWallSegmentsUpper[0].slice(0);
	//	this.cityWallSegmentsUpper[0] = ref.slice(8).concat(ref.slice(1, 8));


		//this.cityWallSegmentsUpper[0] = this.cityWallSegmentsUpper[0].concat(ref.slice(0,8)); //.concat(ref.slice(0, 8))
		this.citadelWallSegmentsUpper = [];

		this.cityWallCDTBoundary = null;
		this.citadelWallPillars = [];
		this.citadelWallPillarPoints = [];
		this.citadelWallSegments = [];

		this.citadelWallEntrancePoint = null;
		this.citadelWallEntrancePillarPoints = [];



		jPillars.each((index, item)=>{
			let poly;
			this.cityWallPillars.push(poly=svgPolyStrToPoints($(item).attr("points")));
			let pt = this.cityWallPillarByAABBCenter ? getBBoxCenter(item.getBBox()) : poly.computeCentroid().centroid;
			this.cityWallPillarPoints.push(pt);
		});

		jEntrances.each((index, item)=>{
			let pt = getBBoxCenter($(item).children()[0].getBBox());
			this.cityWallEntrancePoints.push(pt);
		});


		//this.extrudePathOfPoints(pts, pathRadius, true, true)
		///*
		g.append(
			this.makeSVG("path", {"fill":"none", "stroke-width":0.5, "stroke":"orange",
				d: this.cityWallSegments.map((pts)=>{
					return this.extrudePathOfPoints(pts, pathRadius, true, true).map((p, index)=>{
						return (index >= 1 ? `L ${p[0]},${p[1]}` : `M ${p[0]},${p[1]}`)
					}).join("");
				}).join(" Z ") + " Z"}
		));
		//*/


		if (jSelCitadelWall) {
			//let collectedPoints = [];
			jSelCitadelWall.children("polygon").each((index, item)=>{
				let poly;
				this.citadelWallPillars.push(poly=svgPolyStrToPoints($(item).attr("points")));
				let pt = this.cityWallPillarByAABBCenter ? getBBoxCenter(item.getBBox()) : poly.computeCentroid().centroid;
				this.citadelWallPillarPoints.push(pt);
				//collectedPoints.push(pt);
			});

			this.citadelWallSegments = getSegmentPointsFromSVGLinePath(jSelCitadelWall.children("path").attr("d"));

			let citadelEntranceLines = jSelCitadelWall.find(this.subSelectorEntranceLines);
			if (citadelEntranceLines.length >=3) {
				this.citadelWallEntrancePoint = getBBoxCenter(citadelEntranceLines[0].getBBox());
				this.citadelWallEntrancePillarPoints.push(
					getBBoxCenter(citadelEntranceLines[1].getBBox()), // right first
					getBBoxCenter(citadelEntranceLines[2].getBBox())	// left
				);
			}


			if (this.chamferForWallPillars) {
				this.citadelWallSegments.forEach((value, index, arr)=>{
					arr[index] = chamferCornersOfPoints(value, this.wallPillarRadius*this.entCitadelPillarRadiusScale);
				});
			}

			if (this.chamferForEntranceWall) {
				chamferEndsOfPointsList(this.citadelWallSegments, this.entranceWallPillarRadius ? this.entranceWallPillarRadius : this.wallPillarRadius*this.entCitadelPillarRadiusScale, true);
			}



			this.citadelWallSegmentsUpper = [explode2DArray(this.citadelWallSegments)]; // todo: break and rearrange from start/end citadel

			///*
			g.append(
					this.makeSVG("path", {"fill":"none", "stroke-width":0.5, "stroke":"orange",
						d: this.citadelWallSegments.map((pts)=>{
							return this.extrudePathOfPoints(pts, pathRadius, true, true).map((p, index)=>{
								return (index >= 1 ? `L ${p[0]},${p[1]}` : `M ${p[0]},${p[1]}`)
							}).join("");
						}).join(" Z ") + " Z" }
				));
			//*/


		}

		this.cityWallPillarPoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"yellow", cx:p.x, cy:p.z}))});
		this.cityWallEntrancePoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:p.x, cy:p.z}))});
		this.citadelWallPillarPoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"red", cx:p.x, cy:p.z}))});
		this.citadelWallEntrancePillarPoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:p.x, cy:p.z}))});
		//if (this.citadelWallEntrancePoint) g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:this.citadelWallEntrancePoint.x, cy:this.citadelWallEntrancePoint.z}))

		// Calculate boundary reference to see if within city walls
		let pathSpl = pathString.replace(/M /g, "").replace(/L /g, "").split(" ").map((s)=>{
			s = s.split(",");
			let p = new Vector3(parseFloat(s[0]), 0, parseFloat(s[1]));
			g.append(this.makeSVG("circle", {r:0.5, fill:"red", cx:p.x, cy:p.z}));
			return p;
		});



		let edgesBoundary = [];
		pathSpl.forEach((val, index)=>{
			edgesBoundary.push([index > 0 ? index - 1 : pathSpl.length - 1, index])
		});

		let edgeVertices = pathSpl.map((v)=>{return [v.x, v.z]});
		cleanPSLG(edgeVertices, edgesBoundary);

		let cdt = cdt2d(edgeVertices, edgesBoundary, {exterior:false});
		this.cityWallCDTBoundary = {tris:cdt, vertices:edgeVertices};
		/*
		g.append(
			this.makeSVG("path", {"fill":"rgba(155,255,122,0.3)", "stroke-width":0.1, "stroke":"red",
				d: cdt.map((tri)=>{return triSVGString(this.cityWallCDTBoundary.vertices, tri)}).join(" ")})
		);
		*/


		let wallRadius = 1;
		let verticesSoup = [];
		verticesSoup.push([-this.svgWidth*.5, -this.svgHeight*.5]);
		verticesSoup.push([this.svgWidth*.5, -this.svgHeight*.5]);
		verticesSoup.push([this.svgWidth*.5, this.svgHeight*.5]);
		verticesSoup.push([-this.svgWidth*.5, this.svgHeight*.5]);
		let edges =  [[0,1], [1,2], [2,3], [3,0]];
		//, edges:edges, vertices:verticesSoup

		//

		// [edgeVertices]
		let groundMode = false;
		let lineSegments = groundMode ? this.citadelWallSegments.concat(this.cityWallSegments) : this.citadelWallSegmentsUpper.concat(this.cityWallSegmentsUpper);

		//.concat(this.citadelWallPillars).concat(this.cityWallPillars);
		let cdtObj = this.getCDTObjFromPointsList(lineSegments,
			true, {exterior:false},
			(points, index)=>{
				//points = points.slice(0).reverse();
				return  index < lineSegments.length ? this.extrudePathOfPoints(points, wallRadius, true, true) : points;
			});

		cdt = cdtObj.cdt;
		//cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});


		let navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(cdtObj.vertices, tri)}));
		/*
		navmesh.regions.forEach((r)=> {
			if (!r.convex(true)) {
				console.error("not convex CCW!");
			}
		});
		*/
		NavMeshUtils.weldVertices(navmesh);
		let holesArr = NavMeshUtils.patchHoles(navmesh.regions);
		let combinedRegions = NavMeshUtils.unlinkPolygons(navmesh.regions.concat(holesArr));
		navmesh.regions = combinedRegions;

		//navmesh = new NavMesh();
		//navmesh.attemptBuildGraph = false;
		//navmesh.fromPolygons(combinedRegions);

		g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.4)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));

		/*
		g.append(
			this.makeSVG("path", {"fill":"rgba(255,255,0,1)", "stroke-width":0.1, "stroke":"red",
				d: cdt.map((tri)=>{return triSVGString(cdtObj.vertices, tri)}).join(" ")})
		);
		*/
	}

	parseWards(jSel) {
		var wardCentroids = [];

		let verticesSoup = [];
		let hullVerticesSoup = [];
		let hullEdgesSoup = [[0,1], [1,2], [2,3], [3,0]];
		let hullEdgeCount = 4;
		let buildingEdgeCount = 4;

		hullVerticesSoup.push([-this.svgWidth*.5, -this.svgHeight*.5]);
		hullVerticesSoup.push([this.svgWidth*.5, -this.svgHeight*.5]);
		hullVerticesSoup.push([this.svgWidth*.5, this.svgHeight*.5]);
		hullVerticesSoup.push([-this.svgWidth*.5, this.svgHeight*.5]);

		verticesSoup = hullVerticesSoup.slice(0);
		let baseVerticesSoup = hullVerticesSoup.slice(0);
		let baseHullEdges = hullEdgesSoup.slice(0);
		let buildingEdges = hullEdgesSoup.slice(0);

		let tempWardBuildingEdgesList = [];

		jSel.each((index, item)=>{
			item = $(item);
			let wardObj = {neighborhoodPts: [], neighborhoodHulls: []};
			let wardObjVertices = [];
			item.children("path").each((i, hood)=> {
				hood = $(hood);
				var newStr = this.setupNeighborhoodFromPath(hood.attr("d"), wardObj, i, wardObjVertices);
				hood.attr("d", newStr);
			});

			let len;
			let i;

			let wardObjDelaunay =  Delaunay.from(wardObjVertices);
			let hull = wardObjDelaunay.hull;
			let count = 0;

			let x = 0;
			let y = 0;


			let hullAABB = new AABB();
			let hullPoints = [];
			let pt;
			let points = wardObjDelaunay.points;

			let cx = 0;
			let cy = 0;
			let startHullEdgeCount;

			len = hull.length;
			let addCount = 0;

			for (i=0; i<len; i++) {
				let baseI = (hull[i] << 1);
				x = points[baseI];
				y = points[baseI+1];
				let i1 = i >= 1 ? i - 1 : len - 1;
				let i3 = i >= len - 1 ? 0 : i + 1;
				let x1 = points[(hull[i1] << 1)];
				let y1 = points[(hull[i1] << 1)+1];
				let x3 = points[(hull[i3] << 1)];
				let y3 = points[(hull[i3] << 1)+1];
				let x2 = x;
				let y2 = y;
				//console.log(x1 * (y2 - y3) +   x2 * (y3 - y1) +   x3 * (y1 - y2) )
				let isCollinear = ( x3 - x1 ) * ( y2 - y1 )  -  ( x2 - x1 ) * ( y3 - y1 ) <= this.collinearAreaThreshold;

				/*
				if (isCollinear) {
					continue;
				}
				*/

				// console.log("ADDING");

				if (!isCollinear) {
					cx += x;
					cy += y;
					hullAABB.expand(pt =  new Vector3(x,0,y));
					hullPoints.push(pt);
				}

				/*
				if (i === 2) {
					let coloring =  isCollinear ? "red" : "green";
					item.append(this.makeSVG("circle", {r:0.5, fill:coloring, cx:x1, cy:y1}));
					item.append(this.makeSVG("circle", {r:0.5, fill:"pink", cx:x, cy:y}));
					item.append(this.makeSVG("circle", {r:0.5, fill:coloring, cx:x3, cy:y3}));
				}
				*/
				//if (!isCollinear) item.append(this.makeSVG("circle", {r:0.5, fill:"green", cx:x, cy:y}));


			}



			len = hullPoints.length;


			for (i=0; i<len; i++) {
				let hullVertex;
				hullVerticesSoup.push(hullVertex = [hullPoints[i].x, hullPoints[i].z]);
				hullVertex.id = index; // ward index
				if (i > 0) {
					if (i < len - 1) {
						hullEdgesSoup.push([hullEdgeCount, ++hullEdgeCount]);
					} else {
						hullEdgesSoup.push([hullEdgeCount++, startHullEdgeCount]);
					}
				}
				else {
					startHullEdgeCount = hullEdgeCount;
					hullEdgesSoup.push([hullEdgeCount, ++hullEdgeCount]);
				}
			}


			cx /= len;
			cy /= len;

			wardObj.aabb = hullAABB;
			wardObj.polygon = new Polygon().fromContour(hullPoints);
			wardObj.withinCityWall = this.checkWithinCityWall(cx, cy);
			wardObj.center = [cx,cy];
			//item.append(this.makeSVG("path", {fill:"gray", "stroke-width":0.5, "stroke":"none", d:wardObj.delaunay.renderHull()}));
			item.append(this.makeSVG("circle", {r:0.5, fill:(wardObj.withinCityWall ? "red" : "blue"), cx:cx, cy:cy}));


			this.wards.push(wardObj);
		});

		//console.log(hullVerticesSoup.length + " ::");
		//console.log(hullEdgesSoup);

		//let del;
		//del = Delaunay.from(hullVerticesSoup);

		this.setupWardNeighborhoodRoads();


		// Key stuffs
		//this.setupUpperWards(baseVerticesSoup);

		// test preview
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});

		// temp misc tests

		let hullVerticesSoup3D = hullVerticesSoup.map((v)=> {
			let vertex = new Vector3(v[0], 0, v[1]);
			vertex.id = v.id;
			return vertex;
		});


		let navmesh;
		//console.log(verticesSoup.length + " : "+buildingEdges.length);
		// Ward costs/distances navmesh
		///*
		let cdt;

		// Wards sector navmesh
		///*
		cdt = cdt2d(hullVerticesSoup, hullEdgesSoup, {exterior:true});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		navmesh = new NavMesh();
		//navmesh.attemptMergePolies = false;
		navmesh.fromPolygons(cdt.map((tri)=>{ // this navmesh won';t cacurately reflect the wards though
			return new Polygon().fromContour([ hullVerticesSoup3D[tri[2]], hullVerticesSoup3D[tri[1]], hullVerticesSoup3D[tri[0]] ]);
		}));
		this.setupWardsForNavmesh(navmesh);
		this.setupWardCosts(navmesh);
		//*/

		// Streetmap navmesh
		///*
		cdt = cdt2d(hullVerticesSoup, hullEdgesSoup, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});

		navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;

		navmesh.fromPolygons(cdt.map((tri)=>{
			return new Polygon().fromContour([ hullVerticesSoup3D[tri[2]], hullVerticesSoup3D[tri[1]], hullVerticesSoup3D[tri[0]] ]);
		}));
		this.setupHighwaysVsRoads(navmesh);

		//*/

		//*/

		// Entire floors+buildings navmesh
		/*
		console.log(verticesSoup);
		console.log(buildingEdges);
		cleanPSLG(verticesSoup, buildingEdges);

		let cdt = cdt2d(verticesSoup, buildingEdges, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(verticesSoup, tri)}));
		*/

		//console.log(del);
		//console.log(cdt);
		//del = Delaunay.from(wardCentroids);

		//this.voronoiWards = del.voronoi([-this.svgWidth*.5, -this.svgHeight*.5, this.svgWidth*.5, this.svgHeight*.5]);

		//this.voronoiWards = del.voronoi([aabbWards.min.x, aabbWards.min.z, aabbWards.max.x, aabbWards.max.z]);

		//g.append(this.makeSVG("path", {stroke:"blue", "stroke-width":0.15, d: this.voronoiWards.render()}));

		//let theTris = this.filterTriangles(del.points, del.triangles, (c)=>{return false && !!this.hitWardAtPoint3D(c);}, del);
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.15, d: del.render()}));
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,0,0.2)", "stroke-width":0.15, d: renderTrianglesOf(del)}));

		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,0,0.2)", "stroke-width":0.15, d: cdtSVG}));


		if (navmesh) {
			g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.5)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));
		}
		//del.triangles = theTris;


	}



	setupWardNeighborhoodRoads() {
		let len = this.wards.length;
		let w;
		for (let i=0; i<len; i++) {
			w = this.wards[i];
		}
	}


	/**
	 *
	 * @param {*} navmesh
	 * @param {*} epsilon
	 */
	setupWardsForNavmesh(navmesh, epsilon) {
		//var g = $(this.makeSVG("g", {}));
		//this.map.append(g, {});

		// Register nodes with related wards
		let wards = this.wards;
		let len = wards.length;
		let pt = new Vector3();
		for (let i=0; i<len; i++) {
			let w = wards[i];
			pt.x = w.center[0];
			pt.z = w.center[1];
			//g.append(this.makeSVG("circle", {r:0.5, fill:"blue", cx:pt.x, cy:pt.z}));
			let r = navmesh.getRegionForPoint(pt, epsilon);
			if (!r) {
				console.error("setupWardsForNavmeshes :: Failed to find region for pinpoint");
				continue;
			}
			r.wardIndex = i;
		}

		// bypass non-ward nodes
		let regions = navmesh.regions;
		let graph = navmesh.graph;
		let edges = graph._edges;
		let nodes = graph._nodes;

		let explodeMap = new Map();
		len = regions.length;
		for (let i=0; i<len; i++) {
			let r = regions[i];
			if (r.wardIndex === undefined) {
				// r.withinCityWall = this.checkWithinCityWall(r.centroid.x, r.centroid.y); // no longer needed with explodeMap
				let listOfEdges = edges.get(i);
				explodeMap.set(i, listOfEdges.filter((e)=>{return regions[e.to].wardIndex !== undefined}).map((e)=>{return e.to}) );
			}
		}

		edges.forEach((value, key) => {
			let r = regions[key];
			if (r.wardIndex !== undefined) {
				let listOfEdges = edges.get(key);
				let newEdges = [];
				listOfEdges.forEach((value, index)=> {
					if (explodeMap.has(value.to)) {
						explodeMap.get(value.to).filter((v)=> {
							return v !== key && listOfEdges.indexOf(v) < 0
						}).forEach((v)=> {
							newEdges.push(new NavEdge(key, v, 1))
						});
					}
				});
				listOfEdges = listOfEdges.filter((value)=> {
					return !explodeMap.has(value.to);
				}).concat(newEdges);
				edges.set(key, listOfEdges);
			} else {
				edges.set(key, []);
			}
		});

	}

	getWardIndex(polygon) {
		if (polygon.wardIndex !== undefined) return polygon.wardIndex;  // a saved cached reference is found

		// identify by vertex id (doesnt work if mesh was decimated/altered from original ward hulls)
		let edge = polygon.edge;
		let lastId;
		// all vertices of polygon must have the same vertex id that links to the correct ward
		do {
			if (edge.vertex.id === undefined || (lastId !== undefined ? edge.vertex.id !== lastId : false) ) {
				return -1; // non-found values are not cached!
			}
			lastId = edge.vertex.id;
			edge = edge.next;
		} while (edge !== polygon.edge);

		return (polygon.wardIndex = edge.vertex.id); // cached found
	}

	adjustCostGraphByWards(navmesh, withinCityFree=false) {
		let graph = navmesh.graph;
		let regions = navmesh.regions;
		graph._edges.forEach((edges, nodeIndex) => {
			let len = edges.length;

			for (let i=0; i<len; i++) {
				let e = edges[i];
				let indexTo = this.getWardIndex(regions[e.to]);
				let indexFrom = this.getWardIndex(regions[e.from]);

				//if (indexTo >= 0) console.log(this.wards[indexTo].withinCityWall);
				if (indexTo >= 0 && indexFrom >=0 ) {  // same ward index always free  (dead space)
					if (indexTo === indexFrom) {
						//console.log("Smae ward free");
						e.cost = 0;
					} else if (withinCityFree && this.wards[indexFrom].withinCityWall && this.wards[indexTo].withinCityWall) {
						//console.log("Within city free");
						e.cost = 0;
					} else {
						e.cost = 1;
					//	console.log("A");
					}
				} else {
					console.error("should not happen!!:"+indexTo + " :<"+indexFrom);
				}


			}
		});
	}

	setupWardCosts(navmesh) {
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});


		let regions = navmesh.regions;
		let len = regions.length;
		let r;
		let index;

		let dijk = new Dijkstra(navmesh.graph, -1, -1);

		this.adjustCostGraphByWards(navmesh, true);

		for (let i=0; i<len; i++) {
			r = regions[i];
			index = this.getWardIndex(r);
			if (index >=0) {
				let w = this.wards[index];
				if (w.withinCityWall) { // get costs leading up to this ward outside
					dijk.clear();
					dijk.source = i;
					/*
					let gt;
					g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
						$(gt).text('here');
					*/
					dijk.search();

					dijk._cost.forEach((value, key)=> {
						r = regions[key];
						index = this.getWardIndex(r);
						if (index >= 0) {
							let w  = this.wards[index];

							w.distanceOutsideToWalls = value;

							///*
							let gt;
							g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
							$(gt).text(value);
							//*/
						}
					});
					break;
				}
			}
		}


		/* // todo: identify citadel ward by selector center position with navmesh, useful for heights and other info
		*/
		this.adjustCostGraphByWards(navmesh, false);
		for (let i=0; i<len; i++) {
			r = regions[i];
			index = r.wardIndex;
			if (index === CITADEL_WARD_INDEX) {
				dijk.clear();
				dijk.source = i;
				///*
				let gt;
				g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
				$(gt).text('here');
				//*/

				dijk.search();

				dijk._cost.forEach((value, key)=> {
					r = regions[key];
					index = this.getWardIndex(r);
					if (index >= 0) {
						let w  = this.wards[index];
						w.distanceToCitadel = value;
						///*
						let gt;
						g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
						$(gt).text(value);
						//*/
					}
				});
				break;
			}
		}


	}

	setupHighwaysVsRoads(navmesh) {
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});

		let regions = navmesh.regions;
		let len = regions.length;
		let r;
		let edge;



		let highwayMaxWidthSq = this.highwayMaxWidth * this.highwayMaxWidth;
		let highwayMinWidthSq = this.highwayMinWidth * this.highwayMinWidth;
		let maxRoadEdgeLengthSq =  this.maxRoadEdgeLength* this.maxRoadEdgeLength;
		// highways vs roads (regions)
		let highways = [];
		let roads = [];



		for (let i=0; i<len; i++) {
			r = regions[i];
			edge = r.edge;

			let numOfLongEdges = 0;
			let numOfShortEdges = 0;
			let numOfEdgesWithinCityWalls = 0;
			let extremeLongPerpCount = 0;
			let numOfEdgesJustOutsideCityWalls = 0;

			let streetwards = new Set();

			do {
				if (edge.twin !== null &&
					edge.prev.vertex.id >= 0 && edge.vertex.id >= 0 &&
					edge.vertex.id !== edge.prev.vertex.id
				) {
					//streetnames.add(edge.vertex.id < edge.prev.vertex.id ? edge.vertex.id + "_" + edge.prev.vertex.id : edge.prev.vertex.id + "_" + edge.vertex.id);

					streetwards.add(edge.vertex.id);
					streetwards.add(edge.prev.vertex.id);

					let oppEdge = edge.next;
					while (oppEdge.vertex !== edge.prev.vertex) {
						oppEdge = oppEdge.next;
					}

					//let distance = edge.prev.vertex.squaredDistanceTo(edge.vertex);
					// the above metric isnt reliable if long road sections are telsellated across full diagnal for long thin triangles


					lineSegment.set(oppEdge.prev.vertex, oppEdge.vertex);
					let t = lineSegment.closestPointToPointParameter(edge.vertex, false);
					lineSegment.at( t, pointOnLineSegment );

					//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.25, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));

					numOfEdgesWithinCityWalls += this.wards[edge.prev.vertex.id].withinCityWall && this.wards[edge.vertex.id].withinCityWall ? 1 : 0;

					numOfEdgesJustOutsideCityWalls += this.wards[edge.prev.vertex.id].distanceOutsideToWalls===1 && this.wards[edge.vertex.id].distanceOutsideToWalls === 1 ? 1 : 0;

					let dist =  pointOnLineSegment.squaredDistanceTo( edge.vertex );

					if (dist > maxRoadEdgeLengthSq) {
						//numOfLongEdges = 0;
						//numOfShortEdges = 0;
						//break;
						extremeLongPerpCount++;
					}

					if (dist <= highwayMaxWidthSq) {
						if (dist < highwayMinWidthSq ) { // normal street
							//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.25, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));
							g.append(this.makeSVG("line", {stroke:"rgb(0,122,110)", "stroke-width":0.25, x1:edge.prev.vertex.x, y1: edge.prev.vertex.z, x2:edge.vertex.x, y2:edge.vertex.z}));
							numOfShortEdges++;
						} else { // highway
							//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.5, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));
							g.append(this.makeSVG("line", {stroke:"rgb(255,0,0)", "stroke-width":0.25, x1:edge.prev.vertex.x, y1: edge.prev.vertex.z, x2:edge.vertex.x, y2:edge.vertex.z}));
							numOfLongEdges++;
						}
					}
				}
				edge = edge.next;
			} while(edge !== r.edge);


			// various conditions for specific highlights
			let totalEdges = numOfShortEdges + numOfLongEdges;


			// street id naming
			r.streetId = Array.from(streetwards).sort()
			if (this.streetIdPrecision > 0) {
				r.streetId.slice(0, this.streetIdPrecision + 1);
			}
			r.streetId = r.streetId.join("_");
			//console.log(r.streetId);


			// or numOfEdgesWithinCityWalls >=2
			// && numOfEdgesWithinCityWalls === totalEdges && extremeLongPerpCount ===0
			if (totalEdges >= 2 ) {
				// || !this.checkWithinCityWall(r.centroid.x, r.centroid.z , true)
				if ( numOfLongEdges !== 0) {
					if ( (numOfEdgesWithinCityWalls >=2 || numOfEdgesJustOutsideCityWalls >= 2)) {
						g.append(this.makeSVG("path", {stroke:"blue", fill:(numOfEdgesWithinCityWalls < 2 ? "rgba(255,40,100,0.5)" : "rgba(255,0,0,0.5)"), "stroke-width":0.015, d: polygonSVGString(r) }));

					} else {
						g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,255,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));

					}
				}
				else {
					g.append(this.makeSVG("path", {stroke:"blue", fill:numOfLongEdges === 0 ? "rgba(255,0,255,0.5)" : "rgba(255,0,0,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
				}
			}


		}
	}

	checkWithinCityWall(x, y, defaultVal=false) {
		if (!this.cityWallCDTBoundary) return defaultVal;
		let tris = this.cityWallCDTBoundary.tris;
		let vertices = this.cityWallCDTBoundary.vertices;
		let len = tris.length;
		for (let i=0; i<len; i++) {
			let tri = tris[i];
			if (pointInTriangle(x, y, vertices[tri[0]], vertices[tri[1]], vertices[tri[2]])) {
				return true;
			}
		}
		return false;
	}


	setupUpperWards(baseVerticesSoup) {
		let wards = this.wards;
		baseVerticesSoup = [baseVerticesSoup];
		let len = wards.length;
		let g;
		let sites = [];
		const maxBridgeSqDist = this.maxBridgeDistance*this.maxBridgeDistance;
		const maxBridgeSqDist2 = (this.maxBridgeDistance*this.maxBridgeCheckpointRatio)*(this.maxBridgeDistance*this.maxBridgeCheckpointRatio);



		for (let i=0; i< len; i++) {

			let cdtObj = this.getCDTObjFromPointsList(baseVerticesSoup.concat(explode2DArray(wards[i].neighborhoodPts)), true, {exterior:false});
			let cdt = cdtObj.cdt;
			cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
			let navmesh = new NavMesh();
			navmesh.attemptBuildGraph = false;
			navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(cdtObj.vertices, tri)}));

			/*
			let g = $(this.makeSVG("g", {}));
			this.map.append(g, {});
			g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.5)", "stroke-width":0.015, d: navmesh.regions.map(polygonSVGString).join(" ") }));
			*/

			/*
			var g = $(this.makeSVG("g", {}));
			this.map.append(g, {});
			g.append(this.makeSVG("circle", {r:0.5, fill:"blue", cx:cx, cy:cy}));
			*/

			let spots = SVGCityReader.getEmptyRegionsFromNavmesh(navmesh, this.minPillarRadius+this.pillarSpacing, this.maxPillarRadius+this.pillarSpacing);
			spots.forEach((beyondMaxRad, region, map) => {

				sites.push({region:region, ward:this.wards[i], beyondMaxRad:beyondMaxRad});
			});
		}

		let del = Delaunay.from(sites.map((s)=>{return [s.region.centroid.x, s.region.centroid.z]}));
		let vor = del.voronoi([-this.svgWidth*.5, -this.svgHeight*.5, this.svgWidth*.5, this.svgHeight*.5]);

		//1.5
		//g = $(this.makeSVG("g", {}));
		//this.map.append(g, {});
		//g.append(this.makeSVG("path", {stroke:"blue", "stroke-width":0.25, d: vor.render()}));

		/*
		g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("circle", {r:(beyondMaxRad ? this.maxPillarRadius : this.minPillarRadius), fill:(beyondMaxRad ? "red" : "red"), cx:region.centroid.x, cy:region.centroid.z}));
		*/

		let cells = vor.cellPolygons();

		let wBound = this.svgWidth*.5;
		let hBound = this.svgHeight*.5;
		let count = 0;
		let navmeshPolygons = [];
		for (let c of cells) {
			let s = sites[count];
			g = $(this.makeSVG("g", {}));
			this.map.append(g, {});


			let beyondMaxRad = s.beyondMaxRad;
			let atEdge = false;

			if (this.omitUpperWardsOutliers) {
				for (let i in c) {
					let p = c[i];
					if ( p[0] <= -wBound || p[1] >= wBound || p[1] <= -hBound || p[1]>=hBound ) {
						atEdge = true;
						break;
					}
				}
			}

			if (!atEdge) {
				let navmeshPoly = cellToPolygon(c);
				navmeshPoly.s = s;
				navmeshPolygons.push(navmeshPoly);
				g.append(this.makeSVG("circle", {r:(beyondMaxRad ? this.maxPillarRadius : this.minPillarRadius), fill:(beyondMaxRad ? "red" : "red"), cx:s.region.centroid.x, cy:s.region.centroid.z}));
				if (beyondMaxRad) {
					let upperWardCell = SVGCityReader.resizeHullPoints(s.region.centroid.x, s.region.centroid.z, polygonToCell(s.ward.polygon), this.pillarStrengthRatio * this.maxPillarRadius * 2, this.maxPillarRadius+this.pillarSpacing);
					s.upperWardCell = upperWardCell;
					g.append(this.makeSVG("path", {fill:"rgba(0,0,255,0.5)", "stroke-width":0.5, d: cellSVGString(upperWardCell)}));

				}
			}
			/*
			for (let p in c) {
				g.append(this.makeSVG("circle", {r:0.5, fill:"orange", cx:c[p][0], cy:c[p][1]}));
			}
			*/
			count++;
		}

		// create navmesh from cell polygons to easily track neighbors
		let navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;
		navmesh.attemptMergePolies = false;

		navmesh.fromPolygons(navmeshPolygons);
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.1)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));

		// connect 'em!
		len = navmesh.regions.length;

		// Merge/cleanup upper wards cells pass
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			let edge = region.edge;
			let upperWardCell = region.s.upperWardCell;

			do {
				if (edge.done || !edge.twin || edge.twin.polygon === (edge.prev.twin ? edge.prev.twin.polygon : null) ) {
					edge = edge.next;
					continue;
				}

				let region2 = edge.twin.polygon;
				let upperWardCell2 = region2.s.upperWardCell;

				if (upperWardCell && upperWardCell2 ) {
					if (region2.upperChecked) {
						edge = edge.next;
						continue;
					}
					region.upperChecked = true;
					region2.upperChecked = true;

					if (isOverlappingCells(upperWardCell, upperWardCell2)) {
						let mergedCell = mergeCellsNewHull(upperWardCell, upperWardCell2);
						region.s.upperWardCell = mergedCell;
						region2.s.upperWardCell = mergedCell;
						g.append(this.makeSVG("path", {fill:"rgba(0,0,255,0.5)", "stroke-width":0.5, d: cellSVGString(mergedCell)}));
						edge.twin.done = true;
						edge.done = true;
					} else {
						//mergeCellsNewHull(upperWardCell);
						//mergeCellsNewHull(upperWardCell2);
					}
					// upperCellsSet.set(mergedCell, [region,region2]);
				}
				edge = edge.next;
			} while( edge !== region.edge)

			if (upperWardCell && !region.upperChecked) {
				//mergeCellsNewHull(upperWardCell);
			}

		}

		if (this.fullUpperWardCollideCheck) {
			for (let i=0; i<len; i++) {
				let region = navmesh.regions[i];
				for (let u = i+1; u<len; u++) {
					let region2 = navmesh.regions[u];
					if (region.s.upperWardCell && region2.s.upperWardCell && region.s.upperWardCell !== region2.s.upperWardCell && isOverlappingCells(region.s.upperWardCell, region2.s.upperWardCell)) {
						let mergedCell = mergeCellsNewHull(region.s.upperWardCell,  region2.s.upperWardCell);
						region.s.upperWardCell = mergedCell;
						region2.s.upperWardCell = mergedCell;
						g.append(this.makeSVG("path", {fill:"rgba(0,0,255,0.5)", "stroke-width":0.5, d: cellSVGString(mergedCell)}));
					}
				}
			}
		}

		let allUpperCells = new Set();
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			if (region.s.upperWardCell) {
				allUpperCells.add(region.s.upperWardCell);
			}
		}

		allUpperCells = allUpperCells.values();
		let upperCellPolygons = [];
		for (let entry of allUpperCells) {
			let poly = cellToPolygon(entry);
			setPolygonAABB(poly);
			poly.r = entry;
			upperCellPolygons.push(poly);
		}

		// TODO: Store list of pillars, small + large, and whether it's has connections or not to/from it and it's support+supportInfo
		// Store list of upper ward regions
		// Store links that connect pillars to pillars or upper ward region edges to pillars
		// post process:::
		// function to generate subidivision of buildings for UpperWard (on demand or for all) filtered by any blocking supporting pillars

		// set any region small pillars supporting any upper ward cells
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			let edge = region.edge;
			let upperWardCell = region.s.upperWardCell;

			if (!upperWardCell) {
				let supports = new Set();
				let supportsInfo = new Map();
				for (let entry of upperCellPolygons) {
					let containsTest;
					if ((containsTest=entry.contains(region.s.region.centroid)) || polygonWithinDistanceOf(entry, region.s.region.centroid, this.minPillarRadius)) {
						supports.add(entry.r);
						let dist = getShortestSqDistanceToEdge(entry, region.s.region.centroid);
						dist = Math.sqrt(dist);
						supportsInfo.set(entry.r, dist < this.minPillarRadius + this.pillarSpacing ?  !containsTest || dist <=this.minPillarRadius ? 2 : 1 : 0 );
						edge = edge.next;

					}
				}
				if (supports.size) {
					region.supports = supports;
					region.supportsInfo = supportsInfo;
				}
			}
		}

		// Connect neighbours pass
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			let edge = region.edge;
			let upperWardCell = region.s.upperWardCell;

			do {
				if (edge.done || !edge.twin || edge.twin.polygon === (edge.prev.twin ? edge.prev.twin.polygon : null) ) {
					edge = edge.next;
					continue;
				}
				let region2 = edge.twin.polygon;
				let upperWardCell2 = region2.s.upperWardCell;

				edge.twin.done = true;
				edge.done = true;

				// Check if same upperward cell
				if (upperWardCell && upperWardCell === upperWardCell2) {
					edge = edge.next;
					continue;
				}

				// Check both small pillars within same cell
				if (region.supports && region2.supports && setsIntersection(region.supports, region2.supports).size) {
					edge = edge.next;
					continue;
				}

				// Check small pillar contained within upperward cell
				if (!!upperWardCell !== !!upperWardCell2) {
					let upperRegion = upperWardCell ? region : region2;
					let pillarRegion = (upperWardCell ? region2 : region);
					if ( pillarRegion.supports && pillarRegion.supports.has(upperRegion.s.upperWardCell) ) {
						let supportingPillarInfo = pillarRegion.supportsInfo.get(upperRegion.s.upperWardCell);
						if (supportingPillarInfo >= this.supportPillarBlockLevel) {
							g.append(this.makeSVG("circle", {r:0.5, fill:supportingPillarInfo === 2 ? "pink" : "orange", cx:pillarRegion.s.region.centroid.x, cy:pillarRegion.s.region.centroid.z}));
						}
						edge = edge.next;
						continue;
					}

				}

				// Link 'em up!
				lineSegment.set( edge.prev.vertex, edge.vertex );
				let t = lineSegment.closestPointToPointParameter(region.s.region.centroid, false);
				if (t >= 0 && t <= 1) {
					let distCheck = region.s.region.centroid.squaredDistanceTo(region2.s.region.centroid);
					if (distCheck <= maxBridgeSqDist2) { // distance check
						let needCheckpoint = distCheck <= maxBridgeSqDist;

						if (this.noBridgeAcrossCityWallRamp) {
							// todo: filter
						}
						if (this.noBridgeAcrossCityWall) {
							// todo: filter
						}

						// todo: perp/area-clip threshold check to link to either tower or edge of centroid

						// register
						g.append(this.makeSVG("path", {"stroke":`rgba(255,0,0,${needCheckpoint ? 1 : 0.3})`, "stroke-width":1, d:svgLineFromTo(region.s.region.centroid, region2.s.region.centroid) }));
					}

				}

				edge = edge.next;
			} while( edge !== region.edge)


			if (this.linkBridgesToHighways && (upperWardCell || !region.supports)) {  // && region.s.ward.withinCityWall
				// todo: link bridges to highways
				// console.log(region.s.ward);
			}
		}

	}

	static resizeHullPoints(centerX, centerY, cell, maxRadius, minRadius) {
		let len = cell.length;
		let arr = [];
		let longestDist = 0;

		for (let i=0; i<len; i++) {
			let p = cell[i];
			let dx = p[0] - centerX;
			let dy = p[1] - centerY;
			let testLongestDist = dx*dx + dy*dy;
			if (testLongestDist > longestDist) {
				longestDist = testLongestDist;
			}
		}

		longestDist = 1/Math.sqrt(longestDist);
		for (let i=0; i<len; i++) {
			let p = cell[i];
			let dx = p[0] - centerX;
			let dy = p[1] - centerY;
			dx *= longestDist;
			dy *= longestDist;
			dx *= maxRadius;
			dy *= maxRadius;
			arr.push([centerX + dx, centerY + dy]);
		}

		let minRadiusSq = minRadius*minRadius;

		let prev = new Vector3();
		let cur = new Vector3();
		let centroid = new Vector3(centerX, 0, centerY);
		let lp = arr[len - 1];
		for (let i=0; i<len; i++) {
			let p = arr[i];
			prev.x = lp[0];
			prev.z = lp[1];
			cur.x = p[0];
			cur.z = p[1];
			lineSegment.set( prev, cur );

			let t = lineSegment.closestPointToPointParameter( centroid, false);
			lineSegment.at( t, pointOnLineSegment );
			let distance = pointOnLineSegment.squaredDistanceTo( centroid );
			if (distance < minRadiusSq) {
				let px = pointOnLineSegment.x - centerX;
				let py = pointOnLineSegment.z - centerY;
				let d = Math.sqrt(distance);
				px /= d;
				py /= d;
				px *= minRadius;
				py *= minRadius;

				let dx;
				let dy;
				let sc;
				dx = p[0] - centerX;
				dy = p[1] - centerY;
				d = Math.sqrt(dx*dx + dy*dy);
				dx /= d;
				dy /= d;
				sc = dx * px + dy * py;

				dx *= sc;
				dy *= sc;
				p[0] += dx;
				p[1] +=  dy;

				dx = lp[0] - centerX;
				dy = lp[1] - centerY;
				d = Math.sqrt(dx*dx + dy*dy);
				dx /= d;
				dy /= d;
				sc = dx * px + dy * py;
				dx *= sc;
				dy *= sc;
				lp[0] +=  dx;
				lp[1] +=  dy;
			}
			lp = p;
		}
		return arr;
	}

	static getEmptyRegionsFromNavmesh(navmesh, minRadius, maxRadius) {
		let map = new Map();
		minRadius *= minRadius;
		maxRadius *= maxRadius;


		let len = navmesh.regions.length;
		for (let i=0; i<len; i++) {
			let r = navmesh.regions[i];

			let edge = r.edge;
			let beyondMaxRadius = true;
			let isValid = true;
			do {
				let distToEdge = edge
				lineSegment.set( edge.prev.vertex, edge.vertex );

				let t = lineSegment.closestPointToPointParameter( r.centroid, false);
				lineSegment.at( t, pointOnLineSegment );
				let distance = pointOnLineSegment.squaredDistanceTo( r.centroid );

				if (distance >= minRadius) {
					if (distance < maxRadius) {
						beyondMaxRadius = false;
					}
				} else {
					isValid = false;
					break;
				}

				edge = edge.next;
			} while( edge !== r.edge);

			if (isValid) {
				map.set(r, beyondMaxRadius);
			}
		}

		return map;
	}

	filterTriangles(points, triangles, cancelingMethod, del) {
		//let filtered = new Uint32Array();
		let filteredArr = [];
		let len = triangles.length;
		let cx;
		let cy;

		let count = 0;
		samplePt.z = 0;
		for (let i=0; i<len; i+=3) {
			cx = points[(triangles[i] << 1)];
			cy = points[(triangles[i] << 1)+1];

			cx += points[(triangles[i+1] << 1)];
			cy += points[(triangles[i+1] << 1)+1];

			cx += points[(triangles[i+2] << 1)];
			cy += points[(triangles[i+2] << 1)+1];
			cx /=3;
			cy /=3;

			samplePt.x = cx;
			samplePt.z = cy;

			if (!cancelingMethod(samplePt)) {
				filteredArr[count++] = triangles[i];
				filteredArr[count++] = triangles[i+1];
				filteredArr[count++] = triangles[i+2];
			}
		}

		let filtered = Uint32Array.from(filteredArr);

		if (del) {
			let oldOne = del ? del.triangles : filtered;
			del.triangles = filtered;

			return oldOne;
		}
		return filtered;
	}

	// array of buildings
	setupNeighborhoodFromPath(pathStr, wardObj, indexTrace, wardObjVertices) {
		let buildings = pathStr.split("M ");
		if (buildings[0] === "") buildings.shift();

		let i;
		let len = buildings.length;
		let arr;
		var newPathStr = "";


		let building;
		let closePath;
		let buildingsList = [];

		let pointsForNeighborhood = [];

		// polygons per building

		for (i=0; i<len; i++) {
			building = buildings[i];
			building = building.trim();
			closePath = building.charAt(building.length-1) === "Z";
			if (closePath) {
				building = building.slice(0, building.length-1).trim();
			}
			arr = building.split("L ");
			if (arr[0] === "") arr.shift();

			let v;
			let x;
			let lx;
			let ly;
			let y;
			let dx;
			let dy;

			let count = 0;
			let vLen = arr.length;
			let pointsForBuilding = [];
			let buildingPts = [];
			let addedStr;

			let pArr;
			let gotWeld = false;
			let initArr = [];

			for (v=0; v<vLen; v++) {
				pArr = arr[v].split(",");
				pArr = pArr.map((p=>{return parseFloat(p.trim())}))
				pArr.length = 2;

				x = pArr[0];
				y = pArr[1];

				dx = x- lx;
				dy = y - ly;


				if (v===0 || dx*dx+dy*dy>=this.sqWeldDistThreshold) {
					lx = x;
					ly = y;
					initArr.push(pArr);
				} else {
					//console.log("weld");
					gotWeld = true;
				}

			}


			//initArr.reverse();

			vLen = initArr.length;

			let vArr = [];

			for (v=0; v<vLen; v++) {
				if (!collinear(initArr[v>=1 ? v - 1 : vLen - 1], initArr[v], initArr[v < vLen - 1 ? v+1 : 0], this.collinearThreshold)) {
					vArr.push(initArr[v]);
				} else {
					//console.log("Skipping collinear");
				}
			}

			/* // check CCW
			let val = (vArr[1][1] - vArr[0][1]) * (vArr[2][0] - vArr[1][0]) -  (vArr[1][0] - vArr[0][0]) * (vArr[2][2] - vArr[1][2]);
			let clockwise =  (val > 0);
			if (clockwise) {
				console.log("clockwise");
			} else {
				console.log("CCW");
			}
			*/

			if (vArr.length !== initArr.length) {
				//console.log("Diff length collinear"+vArr.length + " / "+initArr.length);
			}

			vLen = vArr.length;

			if (vLen <= 4) {
				// todo: redone building string
				newPathStr += (addedStr = "M "+building + " Z");
				for (v=0; v<vLen; v++) {

					wardObjVertices.push(vArr[v]);
					buildingPts.push(vArr[v]);
					pointsForNeighborhood.push(vArr[v]);
					/*
					if (vLen !== initArr.length && vLen>=5) {
						// exception
					}
					*/


					count++;

				}

			} else {
				for (v=0; v<vLen; v++) {
					pointsForBuilding.push(vArr[v]);
				}
				// calculate convex hull

				var del = Delaunay.from(pointsForBuilding);
				addedStr = del.renderHull();
				newPathStr += addedStr;  //  + "Z"

				arr = addedStr.slice(1).split("L");

				//console.log(arr.length + " VS " + vLen  + " :: "+indexTrace+","+i);
				vLen = arr.length;

				for (v=0; v<vLen; v++) {
					let pArr = arr[v].split(",");
					pArr = pArr.map((p=>{return parseFloat(p.trim())}))

					/*
					if (vLen !== initArr.length && vLen>=5)  {
						// exception
					}
					*/

					wardObjVertices.push(pArr);
					buildingPts.push(pArr);
					pointsForNeighborhood.push(pArr);
					count++;

				}

				if (pointsForBuilding.length !== vLen) {
					//console.log("Need to save hull");
				}

			}





			if (count > 4) {

			//	console.log(count+ " ? " + pointsForBuilding.length  + " :: "+indexTrace+","+i +  " >> "+addedStr);
			} else if (count < 3) {
				console.warn("Degenerate path found!");
			}

			buildingsList.push(buildingPts);

		}

		var del = Delaunay.from(pointsForNeighborhood);
		let hullPoints = pointsFromDelHull(del);

		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("path", {fill:"none", "stroke-width":0.3, "stroke":"turquoise", d:del.renderHull()}));



		wardObj.neighborhoodHulls.push(hullPoints);
		wardObj.neighborhoodPts.push(buildingsList);
		return newPathStr;

	}

}

export { SVGCityReader };
