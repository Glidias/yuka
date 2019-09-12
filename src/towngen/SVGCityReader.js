import { Vector3 } from "../math/Vector3";
import { AABB } from "../math/AABB.js";
import {Delaunay} from "d3-delaunay";

function collinear(p1, p2, p3, threshold) {
	let x1 = p1[0];
	let y1 = p1[1];
	let x2 =  p2[0];
	let y2 = p2[1];
	let x3 = p3[0];
	let y3 =  p3[1];
	let collinear0 = x1 * (y2 - y3) +   x2 * (y3 - y1) +   x3 * (y1 - y2) <= threshold;
	return collinear0;
}

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
		this.sqWeldDistThreshold = 0.01;
	}

	/**
	 *
	 * @param {Textual contents of SVG} svgContents
	 * @param {HtmlElement|String} previewContainer Any DOM container or selector to display SVG
	 */
	parse(svgContents, previewContainer) {
		console.log($);
		console.log(Delaunay);
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

		console.log(this);
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
			len = hull.length;
			let points = wardObj.delaunay.points;
			for (i=0; i<len; i++) {
				let baseI = (hull[i] << 1);
				x += points[baseI];
				y += points[baseI+1];
			}

			x /= len;
			y /= len;

			wardCentroids.push([x,y]);
			item.append(this.makeSVG("path", {fill:"none", "stroke-width":0.5, "stroke":"red", d:wardObj.delaunay.renderHull()}));
			item.append(this.makeSVG("circle", {r:0.5, fill:"blue", cx:x, cy:y}));
			
			
			this.wards.push(wardObj);
		});

		
		var del = Delaunay.from(wardCentroids);
		this.voronoiWards = del.voronoi([-this.svgWidth*.5, -this.svgHeight*.5, this.svgWidth*.5, this.svgHeight*.5]);

		//this.voronoiWards = del.voronoi([aabbWards.min.x, aabbWards.min.z, aabbWards.max.x, aabbWards.max.z]);
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("path", {stroke:"blue", "stroke-width":0.15, d: this.voronoiWards.render()}));
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
			vLen = initArr.length;

			let vArr = [];
			
			for (v=0; v<vLen; v++) {
				if (!collinear(initArr[v>=1 ? v - 1 : vLen - 1], initArr[v], initArr[v < vLen - 1 ? v+1 : 0], this.collinearThreshold)) {
					vArr.push(initArr[v]);
				} else {
					//console.log("Skipping collinear");
				}
			}

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
