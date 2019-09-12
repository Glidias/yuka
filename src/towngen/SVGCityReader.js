import { Vector3 } from "../math/Vector3";
import {Delaunay} from "d3-delaunay";

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

	parseWards(jSel) {
		jSel.each((index, item)=>{
			item = $(item);
			let wardObj = {vertices:[], neighborhoods:[]};
			item.children("path").each((i, hood)=> {
				hood = $(hood);
				this.setupNeighborhoodFromPath(hood.attr("d"), wardObj);
			});
			this.wards.push(wardObj);
		});
	}

	// array of buildings
	setupNeighborhoodFromPath(pathStr, wardObj) {
		let buildings = pathStr.split("M ");
		if (buildings[0] === "") buildings.shift();

		let i;
		let len = buildings.length;
		let arr;

		let buildingsArr = [];
		let building;
		let closePath;
		// polygons
		for (i=0; i<len; i++) {
			building = buildings[i];
			building = building.trim();
			closePath = building.charAt(building.length-1) === "Z";
			if (closePath) {
				building = building.slice(0, building.length-1).trim();
			}
			arr = building.split("L ");
			if (arr[0] === "") arr.shift();

			let vLen = arr.length;
			let v;
			let x;
			let lx;
			let ly;
			let y;
			let dx;
			let dy;

			let count = 0;
			let pointsForBuilding = [];
			for (v=0; v<vLen; v++) {
				let pArr = arr[v].split(",");
				pArr = pArr.map((p=>{return parseFloat(p.trim())}))

				x = pArr[0];
				y = pArr[1];

				wardObj.vertices.push(pArr);
				count++;
				lx = x;
				ly = y;

			}

			buildingsArr.push(count);
			if (count > 4) {

			}

		}

		wardObj.neighborhoods.push(buildingsArr);

	}

}

export { SVGCityReader };
