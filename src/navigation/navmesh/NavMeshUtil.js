// @ts-check

/**
 * Basic Utility (unlike NavMeshUtils) for commonly used Navmesh functions without exttraneous dependencies
 */
import { HalfEdge } from "../../math/HalfEdge";
import { Polygon } from "../../math/Polygon";
import { Vector3 } from "../../math/Vector3";

const POINT = new Vector3();

/**
* Link polygons by connecting quad polygons or edges
* @param {HalfEdge} connector A HalfEdge of a Polygon #1
* @param {HalfEdge} connector2 A HalfEdge of a Polygon #2
* @param {Polygon} connector3 This will be the connecting polygon to link the polgons if any, given 1 or 2 border edges
*  @param {number} snapDistThreshold For vertices on a half edge, whether to consider additional snapping to weld within certain threshold
*  @param {Polygon[]} polies An array to contain the resulting connecting polygons
* @return The array containing the resulting connecting polygons (if any), or true if the edges are welded together.
*/
export function linkPolygons(connector, connector2=null, connector3=null, snapDistThreshold=0, polies=null) {
        let edge;
        let dx;
        let dz;
        let ex;
        let ez;

        let contours;
        let c;
        let pi = 0;

        if (connector3 !== null) {
            // naive connection by edge midpoint distance checks
            let connector3Arr = [connector3];
            if (polies === null) polies = [];
            contours = [];

            POINT.x = (connector.prev.vertex.x + connector.vertex.x) * 0.5;
            POINT.z = (connector.prev.vertex.z + connector.vertex.z) * 0.5;
            edge = getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);
            // edge to connector

            c = 0;
            contours[c++] = edge.prev.vertex;
            contours[c++] = connector.vertex;
            contours[c++] = connector.prev.vertex;
            contours[c++] = edge.vertex;

            let p;
            contours.length = c;
            polies[pi++] = p = new Polygon().fromContour(contours);

            edge.twin = p.edge.prev;
            p.edge.prev.twin = edge;

            p.edge.prev.twin = connector;
            connector.twin = p.edge.prev;

            if (connector2 !== null) {
                let p2;
                c =0;
                POINT.x = (connector2.prev.vertex.x + connector2.vertex.x) * 0.5;
                POINT.z = (connector2.prev.vertex.z + connector2.vertex.z) * 0.5;
                edge = getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);

                c = 0;
                contours[c++] = edge.prev.vertex;
                contours[c++] = connector2.vertex;
                 contours[c++] = connector2.prev.vertex;
                 contours[c++] = edge.vertex;

                contours.length = c;
                polies[pi++] = p2 =  new Polygon().fromContour(contours);

                edge.twin = p.edge.prev;
                p.edge.prev.twin = edge;

                p2.edge.prev.twin = connector2;
                connector2.twin = p2.edge.prev;

            }
            polies.length = pi;
            return polies;
        } else if (connector!=null && connector2 !== null) {
            // if half edges' vertices are already snapped exactly together, they will be welded and no new polies are created
            if (snapDistThreshold > 0) {

            }
            let tailMatch = connector.prev.vertex.x === connector2.vertex.x && connector.prev.vertex.y === connector2.vertex.y && connector.prev.vertex.z === connector2.vertex.z;
            let headMatch = connector.vertex.x === connector2.prev.vertex.x && connector.vertex.y === connector2.prev.vertex.y && connector.vertex.z === connector2.prev.vertex.z;
            if (tailMatch && headMatch) {
               connector.twin = connector2;
               connector2.twin = connector;
               return true;
            } else {
                if (polies === null) polies = [];

                contours = [];
                 c = 0;

                contours[c++] = connector.vertex;
                if (!headMatch) contours[c++] = connector2.prev.vertex;
                if (!tailMatch) contours[c++] = connector2.vertex;
                contours[c++] = connector.prev.vertex;

                let p;
                polies[pi++] = p = new Polygon().fromContour(contours);

                p.edge.twin = connector;
                connector.twin = p.edge;

               if (headMatch) {
                    p.edge.next.twin = connector2;
                    connector2.twin = p.edge.next;
               } else {
                   p.edge.next.next.twin = connector2;
                   connector2.twin = p.edge.next.next;
               }
               polies.length = pi;
               return polies;
            }
        } else {
            throw new Error("Could not resolve connection case from parameters!");
        }
        return null;
    }

/**
 * 
 * @param {Polygon[]} polygons 
 * @param {Vector3} pt 
 * @param {number} distLimit 
 * @param {boolean} ignoreBorder 
 */
   export function getClosestBorderEdgeCenterToPoint(polygons, pt, distLimit=0, ignoreBorder=false) {
        let len = polygons.length;
        let dist = Infinity;
        let result = null;
        if (!distLimit) distLimit = Infinity;
        else distLimit*=distLimit;

        for (let i =0;i<len; i++) {
            let r = polygons[i];
            let edge = r.edge;
            let ex;
            let ez;
            let dx;
            let dz;
            do {
                if (!edge.twin || ignoreBorder) {
                    ex = (edge.prev.vertex.x + edge.vertex.x) * 0.5;
                    ez = (edge.prev.vertex.z + edge.vertex.z) * 0.5;
                    dx = pt.x - ex;
                    dz = pt.z - ez;
                    let cDist = dx * dx + dz * dz;
                    if (cDist < dist && cDist <= distLimit) {
                        dist = cDist;
                        result = edge;
                    }
                }
                edge = edge.next;
            } while (edge !== r.edge);
        }
        return result;
    }