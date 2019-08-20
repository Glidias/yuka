import { Vector3 } from '../../../math/Vector3';

class FlowVertex extends Vector3 {
	constructor(v) {
		super();
		this.vertex = v;
	}

	/**
	 * Initialises known variables for spinning flow vertex (rotating flow vector) to handle interpolated movement around sharp corners
	 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.68.875&rep=rep1&type=pdf#page=3
	 * @param {*} edgeWithin
	 */
	initSpinning(edgeWithin, onRight, edgeNext, finalDestPt) {
		this.spinningOnRight = onRight;

		// pre-calculate normal proceeding outward from inner edgeWithin to determine when flow vertex starts to spin
		// as long as it meets splitNormal condition, result flow vector will always spin towards agent

		// Is there any intersection that will cause subdivision into sub triangles?
		// check edgeWithin.polygon if it's a triangle or a non-triangle?
		// for triangle, can easily get split point along known boundary edge of polygon (left or right)
		// Get spin edge accordingly and point along split edge for spinningRegion
			//this.splitNormal = new Vector3();
			//this.splitPoint = new Vector3();
		// flag that determines region check to then check for sub-triangles if needed for agent
			//this.splitRegion = edgeWithin.polygon;

		// for non-triangle, triangulation is variable based on the flow to next portal edgeWithin, from start portal edge.
		//    For the sake of simplciity, assumed a quad split on left to right diagonal from startPortal to edgeWithin.
		// In some cases, , this might result in a triangle if both portal edges share the same vertex

		// whether it needs to split into 3rd sub-triangle, is determined based on subsequent edge's flowVertex along common split edge in question
		// Could this action be lazy-defered later until agent enters into splittingRegion?
		// this.edgeOfFlowVertexToCheck = edgeNext???
			// this.splitNormal2 = new Vector3();
			// this.splitPoint2 = new Vector3();
		// howver, if edgeNext is unavailable, then use assumed finalDestPt to determine 3rd sub-triangle split immediately

		return this;
	}

	initFinal(destPt) {
		this.final = true;
		return this;
	}
}

export { FlowVertex };
