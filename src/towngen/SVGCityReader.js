import { Vector3 } from "../math/Vector3.js";
import { Polygon } from "../math/Polygon.js";
import { AABB } from "../math/AABB.js";
import { LineSegment } from "../math/LineSegment.js";
import {Delaunay} from "d3-delaunay";

import cdt2d from "cdt2d";
import cleanPSLG from "clean-pslg";

import {NavMesh} from "../navigation/navmesh/NavMesh.js";

const lineSegment = new LineSegment();
const pointOnLineSegment = new Vector3();

function svgLineFromTo(from, to) {
	return "M"+from.x + ","+from.z + "L" + to.x + ","+to.z;
}

function setsIntersection(a,b) {
	return new Set(
		[...a].filter(x => b.has(x)));
}

function get_side(a , b, c, point1, point2) {
	var s1 = a * point1.x + b * point1.z - c;
	var s1i = s1 > 0 ? 1 : s1 < 0 ? -1 : 0;

	var s2 = a * point2.x + b * point2.z - c;
	var s2i = s2 > 0 ? 1 : s2 < 0 ? -1 : 0;

	var side = s1i * s2i;
	return side < 0 ? -2 : side > 0 ? s1i : s1i == 0 ? s2i : s2i == 0 ? s1i : -2;
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


function cellToPolygon(cell, addAABB) {
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
 * - Retrieves Streetmap Navmesh (Or Highway-only navmesh Or Road-only Navmesh) for easy extrusion
 * - Able to divide out Streetmap Navmesh regions into seperate unique road sections
 * - Retrieves Floor navmeshes from individual Wards, or their neighbourhoods, or of entire world for easy extrusion, or gameplay navigation, etc.
 * - Retrieves out shape of City Wall
 * - Marks Wards that are within the boundaries of City Wall
 * - Retrives highway exits points
 * - Retrieves Citadel building blocks shape
 * - Retrieves plaza region points and landmark
 * - Calculate ward-distances and centroid-to-point euclidean distances of Wards from Citadel and City Wall respectively
 *
 * Future considerations:
 * - Mark out City Walls linked to Citadel
 * - Retrieves BSP tree from Ward of all its buildings, to allow for optimized near-hit first raycasting in-game on large maps.
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

		// General epsilon settings
		this.collinearThreshold = 0.001;
		this.collinearAreaThreshold = 0.01;
		this.sqWeldDistThreshold = 0.01;

		// Upper ward settings
		this.minPillarRadius = 1.7;
		this.maxPillarRadius = 3;
		this.pillarSpacing = 0.5;
		this.pillarStrengthRatio =4.4;
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

		if (this.selectorWards) {
			this.selectorWards = map.children(this.selectorWards);
			if (this.selectorCitadel) this.selectorWards = this.selectorWards.not(this.selectorCitadel);
			if (this.selectorLandmark) this.selectorWards = this.selectorWards.not(this.selectorLandmark);
			//if (this.selectorRoads) this.selectorWards = this.selectorWards.not(this.selectorRoads);
			//if (this.selectorFarmhouses) this.selectorWards = this.selectorWards.not(this.selectorFarmhouses);
			this.parseWards(this.selectorWards);
		}


		/*
		if (this.selectorLandmark) {
			map.children(this.selectorLandmark);
		}

		if (this.selectorCitadel) {
			map.children(this.selectorCitadel);
		}
		*/

		if (previewContainer) {
			$(previewContainer).append(svj);
		}


	}

	makeSVG(tag, attrs) {
		var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
		for (var k in attrs)
			el.setAttribute(k, attrs[k]);
		return el;
	}

	parseWards(jSel) {
		var wardCentroids = [];

		let aabbWards = new AABB();
		this.aabbWards = aabbWards;

		let verticesSoup = [];
		let hullVerticesSoup = [];
		let hullEdgesSoup = [[0,1], [1,2], [2,3], [3,0]];
		let hullEdgeCount = 4;
		let buildingEdgeCount = 4;

		hullVerticesSoup.push([-this.svgWidth*.5, -this.svgHeight*.5]);
		hullVerticesSoup.push([this.svgWidth*.5, -this.svgHeight*.5]);
		hullVerticesSoup.push([this.svgWidth*.5, this.svgHeight*.5]);
		hullVerticesSoup.push([-this.svgWidth*.5, this.svgHeight*.5]);

		verticesSoup = hullVerticesSoup.concat();
		let baseVerticesSoup = hullVerticesSoup.concat();
		let baseHullEdges = hullEdgesSoup.concat();
		let buildingEdges = hullEdgesSoup.concat();

		let tempWardBuildingEdgesList = [];

		jSel.each((index, item)=>{
			item = $(item);
			let wardObj = {vertices:[], neighborhoods:[]};
			item.children("path").each((i, hood)=> {
				hood = $(hood);
				var newStr = this.setupNeighborhoodFromPath(hood.attr("d"), wardObj, i);
				hood.attr("d", newStr);
				this.debugPoints.forEach((val, index)=> {
					item.append(this.makeSVG("circle", {r:0.5, fill:"red", cx:val[0], cy:val[1]}));//  `<circle r="3" cx="${val[0]}" fill="red" stroke-width="1" cy="${val[1]}"></circle>`);
				});
			});

			let len;
			let i;

			len = wardObj.vertices.length;
			for (i=0; i<len; i++) {
				aabbWards.expand(new Vector3(wardObj.vertices[i][0], 0, wardObj.vertices[i][1]));
			}

			wardObj.delaunay =  Delaunay.from(wardObj.vertices);
			let hull = wardObj.delaunay.hull;
			let count = 0;

			let x = 0;
			let y = 0;


			let hullAABB = new AABB();
			let hullPoints = [];
			let pt;
			let points = wardObj.delaunay.points;

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
				if (!isCollinear) item.append(this.makeSVG("circle", {r:0.5, fill:"green", cx:x, cy:y}));



			}



			len = hullPoints.length;


			for (i=0; i<len; i++) {
				hullVerticesSoup.push([hullPoints[i].x, hullPoints[i].z]);
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

			wardCentroids.push([cx,cy]);
			//item.append(this.makeSVG("path", {fill:"gray", "stroke-width":0.5, "stroke":"none", d:wardObj.delaunay.renderHull()}));
			item.append(this.makeSVG("circle", {r:0.5, fill:"blue", cx:cx, cy:cy}));

			verticesSoup = verticesSoup.concat(wardObj.vertices);
			collectWardBuildings(buildingEdges, wardObj.neighborhoods);
			let buildingEdgesForWard = baseHullEdges.concat();
			tempWardBuildingEdgesList.push(buildingEdgesForWard);
			collectWardBuildings(buildingEdgesForWard, wardObj.neighborhoods);

			//collectWardBuildings(building)

			this.wards.push(wardObj);
		});

		//console.log(hullVerticesSoup.length + " ::");
		//console.log(hullEdgesSoup);

		//let del;
		//del = Delaunay.from(hullVerticesSoup);


		// Key stuffs
		// this.setupRoads
		this.setupUpperWards(tempWardBuildingEdgesList,  baseVerticesSoup);


		// temp misc tests

		let navmesh;
		//console.log(verticesSoup.length + " : "+buildingEdges.length);
		// Streetmap navmesh
		/*
		let cdt = cdt2d(hullVerticesSoup, hullEdgesSoup, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		navmesh = new NavMesh();
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(hullVerticesSoup, tri)}));
		*/

		// Entire floors+buildings navmesh
		/*
		console.log(verticesSoup);
		console.log(buildingEdges);
		cleanPSLG(verticesSoup, buildingEdges);

		let cdt = cdt2d(verticesSoup, buildingEdges, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		navmesh = new NavMesh();
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(verticesSoup, tri)}));
		*/

		//console.log(del);
		//console.log(cdt);
		//del = Delaunay.from(wardCentroids);

		//this.voronoiWards = del.voronoi([-this.svgWidth*.5, -this.svgHeight*.5, this.svgWidth*.5, this.svgHeight*.5]);

		//this.voronoiWards = del.voronoi([aabbWards.min.x, aabbWards.min.z, aabbWards.max.x, aabbWards.max.z]);
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		//g.append(this.makeSVG("path", {stroke:"blue", "stroke-width":0.15, d: this.voronoiWards.render()}));

		//let theTris = this.filterTriangles(del.points, del.triangles, (c)=>{return false && !!this.hitWardAtPoint3D(c);}, del);
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.15, d: del.render()}));
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,0,0.2)", "stroke-width":0.15, d: renderTrianglesOf(del)}));

		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,0,0.2)", "stroke-width":0.15, d: cdtSVG}));


		if (navmesh) {
			g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.5)", "stroke-width":0.015, d: navmesh.regions.map(polygonSVGString).join(" ") }));
		}
		//del.triangles = theTris;
	}

	setupUpperWards(tempWardBuildingEdgesList, baseVerticesSoup) {
		let len = tempWardBuildingEdgesList.length;
		let g;
		let sites = [];
		const maxBridgeSqDist = this.maxBridgeDistance*this.maxBridgeDistance;
		const maxBridgeSqDist2 = (this.maxBridgeDistance*this.maxBridgeCheckpointRatio)*(this.maxBridgeDistance*this.maxBridgeCheckpointRatio);

		for (let i=0; i<len; i++) {
			let verticesSoup = baseVerticesSoup.concat(this.wards[i].vertices);
			let buildingEdges = tempWardBuildingEdgesList[i];
			cleanPSLG(verticesSoup, buildingEdges);

			let cdt = cdt2d(verticesSoup, buildingEdges, {exterior:false});
			cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
			let navmesh = new NavMesh();
			navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(verticesSoup, tri)}));

			///*
			let g = $(this.makeSVG("g", {}));
			this.map.append(g, {});
			g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.5)", "stroke-width":0.015, d: navmesh.regions.map(polygonSVGString).join(" ") }));
			//*/

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
		navmesh.attemptMergePolies = false;

		navmesh.fromPolygons(navmeshPolygons);
		g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.1)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));

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
				let t = lineSegment.closestPointToPointParameter(region.centroid, false);
				if (t >= 0 && t <= 1) { // perpendicular neighboring edge check (hmm..didn't work for some cases dunno why)
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


			if (this.linkBridgesToHighways && (upperWardCell || !region.supports)) {  // && region.s.ward.withinCityWalls
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
	setupNeighborhoodFromPath(pathStr, wardObj, indexTrace) {
		let buildings = pathStr.split("M ");
		if (buildings[0] === "") buildings.shift();

		let i;
		let len = buildings.length;
		let arr;
		var newPathStr = "";


		let buildingsArr = [];
		let building;
		let closePath;
		// polygons per building

		this.debugPoints = [];
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
				buildingsArr.push(vLen);
				for (v=0; v<vLen; v++) {

					wardObj.vertices.push(vArr[v]);
					if (vLen !== initArr.length && vLen>=5) this.debugPoints.push(vArr[v]);
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

				buildingsArr.push(vLen);

				for (v=0; v<vLen; v++) {
					let pArr = arr[v].split(",");
					pArr = pArr.map((p=>{return parseFloat(p.trim())}))

					//if (vLen !== initArr.length && vLen>=5) this.debugPoints.push(pArr);
					wardObj.vertices.push(pArr);
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



		}

		wardObj.neighborhoods.push(buildingsArr);

		return newPathStr;

	}

}

export { SVGCityReader };
