import { Polygon } from '../../math/Polygon.js';
import { FlowTriangulate } from './FlowTriangulate.js';

class NavMeshFlowField {
	constructor(navMesh) {
		this.edgeFieldMap = new Map();	// <Edge (of portal), [vec1, vec2]>
		this.navMesh = navMesh;
	}

	setupTransitional(pathRef, singleNode) {
		this.localTriangulation = new FlowTriangulate();
		// create triangulation pathRef from/to node
		this.triangulationMap = null;
		return "";	// return string-based key for storage
	}

	setupPersistant() {
		this.localTriangulation = null;
		this.triangulationMap = new Map();	// <Edge (of portal), FlowTriangulate>
	}

	getFlowFieldTriangle(pathRef, regionIndex) {
		// return connected edge reference of polygon?
		// or calc dummy polygon reference of polygon to return?
	}

	calcForceFromFlowfield() {

	}
}