import { Vector3 } from "../math/Vector3.js";
import { Polygon } from "../math/Polygon.js";
import { AABB } from "../math/AABB.js";
import {Delaunay} from "d3-delaunay";

import cdt2d from "cdt2d";
import cleanPSLG from "clean-pslg";

import {NavMesh} from "../navigation/navmesh/NavMesh.js";

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
 * Analyses city SVG file that can be generated from https://watabou.itch.io/medieval-fantasy-city-generator .
 * Acts as a springboard to generate street map, navigation graphs, etc. from SVG city layout
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

		this.collinearThreshold = 0.001;
		this.collinearAreaThreshold = 0.01;
		this.sqWeldDistThreshold = 0.01;

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
		let buildingEdges = hullEdgesSoup.concat();

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

			this.wards.push(wardObj);
		});

		//console.log(hullVerticesSoup.length + " ::");
		//console.log(hullEdgesSoup);

		//let del;
		//del = Delaunay.from(hullVerticesSoup);


		//console.log(verticesSoup.length + " : "+buildingEdges.length);
		///*
		let cdt = cdt2d(hullVerticesSoup, hullEdgesSoup, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		let navmesh = new NavMesh();
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(hullVerticesSoup, tri)}));
		//*/

		/*
		console.log(verticesSoup);
		console.log(buildingEdges);
		cleanPSLG(verticesSoup, buildingEdges);

		let cdt = cdt2d(verticesSoup, buildingEdges, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		let navmesh = new NavMesh();
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

		g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,1)", "stroke-width":0.015, d: navmesh.regions.map(polygonSVGString).join(" ") }));
		//del.triangles = theTris;
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
