import { SteeringBehavior } from '../SteeringBehavior.js';
import { FlowAgent } from '../../navigation/navmesh/flowfield/FlowAgent.js';

// import { Vector3 } from '../../math/Vector3.js';

//const desiredVelocity = new Vector3();

/**
* Flowfield behaviour through a navmesh
*
* @author Glidias
* @augments SteeringBehavior
*/

class NavMeshFlowFieldBehaviour extends SteeringBehavior {

	/**
	 *
	 * @param {NavMesh} navmesh
	 * @param {AStar|BFS|DFS|Dijkstra} pathRef
	 */
	constructor( navmesh, pathRef ) {

	}
}

export { NavMeshFlowFieldBehaviour };