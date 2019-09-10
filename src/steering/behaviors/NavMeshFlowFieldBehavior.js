import { SteeringBehavior } from '../SteeringBehavior.js';
import { FlowAgent } from '../../navigation/navmesh/flowfield/FlowAgent.js';
import { FlowTriangulate } from '../../navigation/navmesh/flowfield/FlowTriangulate.js';
import { Vector3 } from '../../math/Vector3.js';
import { LineSegment } from '../../math/LineSegment.js';
import { NavMeshFlowField } from '../../navigation/navmesh/flowfield/NavmeshFlowField.js';

const desiredVelocity = new Vector3();

const closestPoint=  new Vector3();

const pointOnLineSegment = new Vector3();
const lineSegment = new LineSegment();
function clampPointWithinRegion(region, point) {
	let edge = region.edge;
	let minDistance = Infinity;

	// consider todo: alternate faster implementation with edge perp dot product checks?
	do {
		lineSegment.set( edge.prev.vertex, edge.vertex );
		const t = lineSegment.closestPointToPointParameter( point );
		lineSegment.at( t, pointOnLineSegment );
		const distance = pointOnLineSegment.squaredDistanceTo( point );
		if ( distance < minDistance ) {
			minDistance = distance;
			//closestBorderEdge.edge = edge;
			//closestBorderEdge.
			closestPoint.copy( pointOnLineSegment );
		}
		edge = edge.next;
	} while (edge !== region.edge);

	return closestPoint;
}

/**
* Flowfield behavior through a navmesh
*
* @author Glidias
* @augments SteeringBehavior
*/

class NavMeshFlowFieldBehavior extends SteeringBehavior {

	/**
	 *
	 * @param {NavMeshFlowField} flowField For now, only accepts a persistant NavMeshFLowField. (todo: non-persitant flowfield case)
	 */
	constructor(flowField, finalDestPt, pathRef, epsilon = 1e-3, arrivalDist = 0, arrivalCallback=null) {
		super();
		this.flowField = flowField;
		this.finalDestPt = finalDestPt;
		this.epsilon = epsilon;
		this.pathRef = pathRef;
		this.arrivalSqDist = arrivalDist === 0 ? this.epsilon : arrivalDist;
		this.arrivalSqDist *= this.arrivalSqDist;
		this.arrivalCallback = arrivalCallback;
	}

	onAdded(vehicle) {
		vehicle.agent = new FlowAgent();
	}

	onRemoved(vehicle) {
		vehicle.agent = null;
	}

	calculate( vehicle, force /*, delta */ ) {
		let agent = vehicle.agent;

		desiredVelocity.x = 0;
		desiredVelocity.z = 0;
		let refPosition = vehicle.position;

		if (agent.lane === false || agent.lane === true) {	// arrival routine
			if (vehicle.position.squaredDistanceTo(this.finalDestPt) < this.arrivalSqDist) {
				if (agent.lane === false) {
					if (this.arrivalCallback !== null) this.arrivalCallback(vehicle);
					agent.lane = true;
				}
			} else {
				agent.calcDir(refPosition, desiredVelocity);
			}
			desiredVelocity.x *= vehicle.maxSpeed;
			desiredVelocity.z *= vehicle.maxSpeed;
			force.x = desiredVelocity.x - vehicle.velocity.x;
			force.z = desiredVelocity.z - vehicle.velocity.z;
			return force;
		}

		if (!agent.curRegion) {
			this.setCurRegion(vehicle);
			if (!agent.curRegion) {
				force.x = -vehicle.velocity.x;
				force.z = -vehicle.velocity.z;
				return force;
			}
		} else {
			let region;
			if (agent.lane === null) {
				region = agent.getCurRegion();
				if (this.flowField.hasFlowFromRegion(region)) this.setCurRegion(vehicle, region);
				else {
					force.x = -vehicle.velocity.x;
					force.z = -vehicle.velocity.z;
					return force;
				}
			}
			if (!agent.withinCurrentTriangleBounds(refPosition)) {
				region = agent.getCurRegion();
				if ((region.edge.next.next.next !== region.edge && agent.withinCurrentRegionBounds(vehicle.position)) && agent.withinFlowPlane(vehicle.position, this.epsilon) ) {
					// update triangle from triangulation
					agent.curRegion.updateLane(refPosition, agent);
					//console.log("New lane:"+agent.lane);
					agent.curRegion.updateFlowTriLaned(refPosition, agent, this.flowField.edgeFieldMap);
				} else { // doesn't belong to current region
					let lastRegion = agent.curRegion;


					if (this.setCurRegion(vehicle) === false) {
						// ARRIVED
						//vehicle.velocity.x = 0;
						//vehicle.velocity.y = 0;

						agent.lane = false;
						agent.calcDir(refPosition, desiredVelocity);
						desiredVelocity.x *= vehicle.maxSpeed;
						desiredVelocity.z *= vehicle.maxSpeed;

						force.x = desiredVelocity.x - vehicle.velocity.x;
						force.z = desiredVelocity.z - vehicle.velocity.z;

						return force;
					}

					if (!agent.curRegion) {
						refPosition = clampPointWithinRegion(region, refPosition);
						agent.curRegion = lastRegion;
						if (region.edge.next.next.next !== region.edge && lastRegion !== region) { // 2nd && case for FlowTriangulate
							lastRegion.updateLane(refPosition, agent);
							//console.log("New lane222:"+agent.lane);
							lastRegion.updateFlowTriLaned(refPosition, agent, this.flowField.edgeFieldMap);
						}
					}
				}
			}
		}

		agent.calcDir(refPosition, desiredVelocity);

		/*
		if (isNaN(desiredVelocity.x)) {
			console.log([agent.a, agent.b, agent.c, agent.curRegion])
			throw new Error("NaN desired velocity calculated!"+agent.currentTriArea() + " :: "+agent.lane);
		}
		*/

		// desiredVelocity.multiplyScalar( vehicle.maxSpeed );
		desiredVelocity.x *= vehicle.maxSpeed;
		desiredVelocity.z *= vehicle.maxSpeed;

		// The steering force returned by this method is the force required,
		// which when added to the agent’s current velocity vector gives the desired velocity.
		// To achieve this you simply subtract the agent’s current velocity from the desired velocity.

		//return force.subVectors( desiredVelocity, vehicle.velocity );
		force.x = desiredVelocity.x - vehicle.velocity.x;
		force.z = desiredVelocity.z - vehicle.velocity.z;
		//force.x = desiredVelocity.x;
		//force.z = desiredVelocity.z;
		return force;
	}

	/**
	 * Set current region based on vehicle's position to vehicle's agent
	 * @param {Vehicle} vehicle The vehicle
	 * @param {Polygon} forceSetRegion (Optional) A region to force a vehicle to be assosiated with, else attempt will search a suitable region on navmesh.
	 *  Setting this parameter to a falsey value that isn't undefined (eg. null) will perform additional within bounds refPosition clamp check.
	 *  WARNING: It is assumed this `forceSetRegion` will be able to reach final destination node
	 * @return {Null|Number|Boolean}
	 * Null if no region could be picked.
	 * True if same region detected from last saved region
	 * False if no flow path could be found due to reaching final destination.
	 * Zero `0` if no flow path  ould be found at all to reach final destination.
	 * One `1` if no flow path could be found (not yet reached final destination).
	 */
	setCurRegion(vehicle, forceSetRegion) {
		let agent = vehicle.agent;
		let flowField = this.flowField;
		let lastRegion = !forceSetRegion ? agent.getCurRegion() : null;
		let regionPicked = !forceSetRegion ? flowField.navMesh.getRegionForPoint(vehicle.position, this.epsilon) : forceSetRegion;
		if (!regionPicked) {
			agent.curRegion = null;
			return null;
		}

		let refPosition = vehicle.position;

		// ensure refPosition clamped is within forceSetRegion
		if (forceSetRegion !== undefined && !FlowAgent.pointWithinRegion(refPosition, regionPicked)) {
			refPosition = clampPointWithinRegion(regionPicked, refPosition);
		}

		if (regionPicked === lastRegion) {
			if (agent.curRegion !== regionPicked) {
				agent.curRegion.updateLane(refPosition, agent);
				agent.curRegion.updateFlowTriLaned(refPosition, agent, flowField.edgeFieldMap);
			}
			return true;
		}

		let lastNodeIndex = lastRegion ? flowField.getFromNodeIndex(lastRegion, regionPicked, this.pathRef) : -1;
		//console.log(lastNodeIndex + ">>>");

		let edgeFlows = flowField.calcRegionFlow(lastNodeIndex, flowField.navMesh.getNodeIndex(regionPicked), this.pathRef, this.finalDestPt);
		if (!edgeFlows) {
			agent.curRegion = null;
			console.log("setCurRegion:: Could not find flow path from current position")
			return 0;
		}

		if (regionPicked.edge.next.next.next === regionPicked.edge) { // triangle
			agent.curRegion = regionPicked;
			if (edgeFlows.length ===0) {
				//console.log("ARRIVED at last triangle region");
				FlowTriangulate.updateNgonFinalTri(regionPicked, refPosition, agent, flowField.edgeFieldMap, this.finalDestPt, this.epsilon);
				return false;
			}
			agent.lane = 0;
			FlowTriangulate.updateTriRegion(agent.curRegion, agent, flowField.edgeFieldMap);
		} else { // non-tri zone
			if (edgeFlows.length === 0) {
				//console.log("ARRIVED at last non-tri region");
				agent.curRegion = regionPicked;
				FlowTriangulate.updateNgonFinalTri(regionPicked, refPosition, agent, flowField.edgeFieldMap, this.finalDestPt, this.epsilon);
				return false;
			}

			/*
			(lastNodeIndex >= 0 ?
					regionPicked.getEdgeTo(flowField.navMesh.regions[lastNodeIndex]) :
					flowField.triangulationMap.get(regionPicked)
			*/
			agent.curRegion = flowField.triangulationMap.get(edgeFlows[0]);


			if (!agent.curRegion) {
				agent.curRegion = flowField.setupTriangulation(null, edgeFlows[0], edgeFlows[0]);
			}
			agent.curRegion.updateLane(refPosition, agent);
			agent.curRegion.updateFlowTriLaned(refPosition, agent, flowField.edgeFieldMap);
		}
		return 1;
	}
}

export { NavMeshFlowFieldBehavior };