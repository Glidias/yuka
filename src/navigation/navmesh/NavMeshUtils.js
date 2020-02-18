import { Graph } from '../../graph/core/Graph.js';
import { NavNode } from '../core/NavNode.js';
import { NavEdge } from '../core/NavEdge.js';
import { Vector3 } from '../../math/Vector3.js';
import { Polygon } from '../../math/Polygon.js';
import { Plane } from '../../math/Plane.js';
import {HalfEdge} from '../../math/HalfEdge.js';
import {LineSegment} from '../../math/LineSegment.js';

var MAX_HOLE_LEN = 16;

const PLANE = new Plane();
const POINT = new Vector3();
const A = new Vector3();
const B = new Vector3();
const C = new Vector3();

// dfs search through edges by related mapped edge.prev vertices
function searchEdgeList(map, builtContour, startingEdge) {
    let edgeList = map.get(startingEdge.vertex);
    if (!edgeList) return 0;
    let len = edgeList.length;
    builtContour[0] = startingEdge;
    for (let i=0; i<len; i++) {
        let bi = searchEdge(map, builtContour, edgeList[i], startingEdge, 1);
        if (bi >= 3) return bi;
    }
    return 0;
}

function length2DSegment(segment) {
    let dx = segment.to.x - segment.from.x;
    let dz = segment.to.z - segment.from.z;
    return Math.sqrt(dx*dx + dz*dz);
}

function lengthSq2DSegment(segment) {
    let dx = segment.to.x - segment.from.x;
    let dz = segment.to.z - segment.from.z;
    return dx*dx + dz*dz;
}

function searchEdge(map, builtContour, edge, startingEdge, bi) {
    if (bi >= MAX_HOLE_LEN) return 0;
    let edgeList = map.get(edge.vertex);
    if (!edgeList) return 0;
    let i;
    let len = edgeList.length;
    builtContour[bi++] = edge;

    for (i=0; i<len; i++) {
        if (edgeList[i] === startingEdge) {
            return bi;
        }
        else {
           let result =  searchEdge(map, builtContour, edgeList[i], startingEdge, bi);
           if (result >= 3) return result;
        }
    }
    return 0;
}

function setToPerp(vec, result) {
    if (!result) result = vec;

    var dx = vec.x;
    var dz = vec.z;
    result.x = dz;
    result.z = -dx;
}

/**
 *
 * @param {HalfEdge} edge Assumes edge.normal/edge.dir already precaulcated
 * @param {HalfEdge} neighborEdge Assumes neighborEdge.normal/neighborEdge.dir already precaulcated
 * @param {Vector3} vertex
 * @param {Number} inset
 * @param {Vector3} plane Will save additional w property representing offset along plane
 */
function calcPlaneBoundaryBetweenEdges(edge, neighborEdge, vertex, inset, plane) {
    if (plane === undefined) plane = new Vector3();

    let planeX = (neighborEdge.normal.x + edge.normal.x) * 0.5;
    let planeZ = (neighborEdge.normal.z + edge.normal.z) * 0.5;
    if (planeX * planeX + planeZ * planeZ < 1e-7) {
        let sc = edge.vertex === vertex ? 1 : -1;
        planeX = edge.dir.x * sc;
        planeZ = edge.dir.z * sc;
    }
    plane.x = -planeX;
    plane.z = -planeZ;
    plane.w = vertex.x * plane.x + vertex.z * plane.z - inset;
    return plane;
}

function isMirroredEdge(edge, neighborEdge) {
    let res = (edge.dir.x * neighborEdge.dir.x + edge.dir.z * neighborEdge.dir.z === -1);  // <=  + 1e-5
    // if (res) console.log("Detected mirroed edge:" + edge.index + " ," + neighborEdge.index);
    return res;
}

function getIntersectionTimeToPlaneBound(origin, dx, dz, plane) {
    let denom = dx * plane.x + dz * plane.z;
    //t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

    let numerator = -((origin.x * plane.x + origin.z * plane.z) - plane.w); // difference in offset
    //t = (d-(O.N))/(D.N)
    return numerator/denom;
}



function findNeighborEdgeCompHeadArr(edges, edge, vertex, visitedEdgePairs, edgeLen) {
    let len = edges.length;
    let arr = [];
    let edgeKey;
    let foundCount = 0;
    for (let i =0; i< len; i++) {
        let candidate = edges[i];
        if (candidate.prev.vertex === vertex) {
            edgeKey = getKeyEdgePair(edge, candidate, edgeLen);
            if (!visitedEdgePairs.has(edgeKey)) arr.push(candidate);
            else console.warn("already found pair"); // seems this will never happen
            foundCount++;
            //break;
        }
    }
    return foundCount > 0 ? arr : null;
}

// to depecriate,. kept for debugging/asserting purposes only
function getKeyEdgePair(edge, edge2, len) {
    let boo = edge.index < edge2.index;
    let e1 = boo ? edge.index : edge2.index;
    let e2 = boo ? edge2.index : edge.index;
    return e1*len + e2;
}

/* // depecrated
function findNeighborEdgeCompHead(edges, vertex) {
    let len = edges.length;
    for (let i =0; i< len; i++) {
        if (edges[i].prev.vertex === vertex) return edges[i];
    }
    return null;
}

function findNeighborEdgeCompTail(edges, vertex) {
    let len = edges.length;
    for (let i =0; i< len; i++) {
        if (edges[i].vertex === vertex) return edges[i];
    }
    return null;
}

function findNeighborEdgeCompTailArr(edges, edge, vertex, visitedEdgePairs, edgeLen) {
    let len = edges.length;
    let arr =[];
    let edgeKey;
    let foundCount = 0;
    for (let i =0; i< len; i++) {
        let candidate = edges[i];
        if (candidate.vertex === vertex) {
            edgeKey = getKeyEdgePair(edge, candidate, edgeLen);
            if (!visitedEdgePairs.has(edgeKey)) arr.push(candidate);
            foundCount++;
            //break;
        }
    }
    return foundCount > 0 ? arr : null;
}
*/

var transformId = 0;

class NavMeshUtils {

    // todo: boundary edge: inset

    /*
    static cacheRegionIndexLookup(navMesh) {
		if (!navMesh.regionIndexMap) {
			navMesh.regionIndexMap = new Map();
			var len = navMesh.regions.length;
			for (var i=0; i<len; i++) {
				navMesh.regionIndexMap.set(navMesh.regions[i], i);
			}
			navMesh.getNodeIndex = NavMeshUtils.getCachedNodeIndexForRegionProto;
		}
	}

	static getCachedNodeIndexForRegionProto(region) {
		return this.regionIndexMap.has(region) ? this.regionIndexMap.get(region) : -1;
    }
    */

   static planeFromCoplarVertexIndices(vertices, i, i2, i3) {
        i*=3;
        i2*=3;
        i3*=3;
        A.set(vertices[i], vertices[i+1], vertices[i+2]);
        B.set(vertices[i2], vertices[i2+1], vertices[i2+2]);
        C.set(vertices[i3], vertices[i3+1], vertices[i3+2]);
        return PLANE.fromCoplanarPoints(A, B, C);
   }

    /**
     * Sets up triangulated data for 3D rendering from  polygon references to be extruded
     * @param {*} collector An object of existing "vertices" and "indices" array to push values into
     * @param {Array} polygons Assumed all polygons in this list share a unique exclusive set of vertices for them only
     * @param {Number} yVal Extrude downwards by yVal of current polygon's y values, otherwise, extrude down to yBottom if yBottom is defined number, with  yVAl is treated as fixed y value to extrude from.
     * @param {Number} xzScale The scale for output vertices in XZ direction
     * @param {Boolean|Number} yBottom   If yBottom is set to boolean true instead, than yVal is treated as the absolute "bottom" value instead to extrude downwards towards from current polygons' y positions.
     * @param {Number} yBottomMin If yBottom isn't specified as an absolute number, this additional optional parameter limits how far down a polygon can extrude downwards by an absolute y value
     * @param {Object} extraParams Extra extrusion params added to the default set of parameters
     */
    static collectExtrudeGeometry(collector, polygons, yVal, xzScale=1 , yBottom, yBottomMin, extraParams) {
        transformId++;

        const vertices = collector.vertices;
        const indices = collector.indices;
        const normals = collector.normals;
        let vi = vertices.length;
        let vc = vi / 3;
        let ii = indices.length;
        let ni = vi;

        let nx;
        let nz;
        let dn;

        let len = polygons.length;
        const defaultExtrudeParams = {
            yBottom: yBottom,
            yBottomMin: yBottomMin,
            yVal: yVal
        };
        if (extraParams) {
            for (let p in extraParams) {
                defaultExtrudeParams[p] = extraParams[p];
            }
        }
        let extrudeParams;

        // to map extrudeParams to a map of vertex ids to extrusion vertex ids
        let profile;
        let profileMap = new Map();

        const faceIndices = [];
        let fi = 0;
        let edge;
        let targYBottom;

        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            edge = polygon.edge;

            fi = 0;
            extrudeParams = !polygon.yExtrudeParams ? defaultExtrudeParams : polygon.yExtrudeParams;
            if (profileMap.has(extrudeParams)) {
                profile = profileMap.get(extrudeParams);
            } else {
                profileMap.set(extrudeParams, profile=new Map());
            }

            let absoluteYRange = typeof extrudeParams.yBottom === "number";
            let considerEdges = yVal !== 0 || (absoluteYRange || yBottom);

            let edgeIndex = 0;
            do {
                if (edge.vertex.transformId !== transformId && !extrudeParams.bordersOnly) {
                    edge.vertex.id = vc++;
                    vertices[vi++] = edge.vertex.x * xzScale;
                    vertices[vi++] = absoluteYRange ? extrudeParams.yVal : edge.vertex.y;
                    vertices[vi++] = edge.vertex.z * xzScale;
                    normals[ni++] = 0;
                    normals[ni++] = 1;
                    normals[ni++] = 0;
                    edge.vertex.transformId = transformId;
                }

                faceIndices[fi++]  = edge.vertex.id;

                ///*
                if (!extrudeParams.bordersOnly && extrudeParams.yBottom !== true && !profile.has(edge.vertex.id)) {
                    profile.set(edge.vertex.id, vc++);
                    vertices[vi++] = edge.vertex.x * xzScale;
                    targYBottom = absoluteYRange ? extrudeParams.yBottom : extrudeParams.yBottom === true ? extrudeParams.yVal : edge.vertex.y - extrudeParams.yVal;
                    vertices[vi++] = extrudeParams.yBottomMin === undefined ? targYBottom : Math.max(extrudeParams.yBottomMin, targYBottom);
                    vertices[vi++] = edge.vertex.z * xzScale;

                    normals[ni++] = 0;
                    normals[ni++] = -1;
                    normals[ni++] = 0;
                }
                //*/

                if (extrudeParams.useEdgeMask ? ((polygon.edgeMask ? polygon.edgeMask : 0) & (1<<edgeIndex)) : edge.twin === null && considerEdges) {
                    ///*
                    let a;
                    let b;
                    let c;
                    let d;
                    // tri 1
                    targYBottom = absoluteYRange ? extrudeParams.yBottom : extrudeParams.yBottom === true ? extrudeParams.yVal : edge.prev.vertex.y - extrudeParams.yVal;
                    indices[ii++] = a = vc++;
                    vertices[vi++] = edge.prev.vertex.x * xzScale;
                    vertices[vi++] = extrudeParams.yBottomMin === undefined ? targYBottom : Math.max(extrudeParams.yBottomMin, targYBottom);
                    vertices[vi++] = edge.prev.vertex.z * xzScale;
                    nx = -edge.prev.vertex.z;
                    nz = edge.prev.vertex.x;
                    dn = Math.sqrt(nx*nx + nz*nz);
                    nx /= dn;
                    nz /= dn;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    targYBottom = absoluteYRange ? extrudeParams.yBottom : extrudeParams.yBottom === true ? extrudeParams.yVal : edge.vertex.y - extrudeParams.yVal;
                    indices[ii++] = b = vc++;
                    vertices[vi++] = edge.vertex.x * xzScale;
                    vertices[vi++] = extrudeParams.yBottomMin === undefined ? targYBottom : Math.max(extrudeParams.yBottomMin, targYBottom);
                    vertices[vi++] = edge.vertex.z * xzScale;
                    nx = -edge.vertex.z;
                    nz = edge.vertex.x;
                    dn = Math.sqrt(nx*nx + nz*nz);
                    nx /= dn;
                    nz /= dn;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    // top right
                    indices[ii++] = c = vc++;
                    vertices[vi++] = edge.vertex.x * xzScale;
                    vertices[vi++] = edge.vertex.y;
                    vertices[vi++] = edge.vertex.z * xzScale;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    // top left
                    d = vc++;
                    vertices[vi++] = edge.prev.vertex.x * xzScale;
                    vertices[vi++] = edge.prev.vertex.y;
                    vertices[vi++] = edge.prev.vertex.z * xzScale;
                    nx = -edge.prev.vertex.z;
                    nz = edge.prev.vertex.x;
                    dn = Math.sqrt(nx*nx + nz*nz);
                    nx /= dn;
                    nz /= dn;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    // tri2
                    indices[ii++] = a;
                    indices[ii++] = c;
                    indices[ii++] = d;
                   // */
                }

                edge = edge.next;
                edgeIndex++;
            } while(edge !== polygon.edge)


            if (!extrudeParams.bordersOnly) {
                 let fLen = fi - 1;

                // set up upper top face indices
                if (!extrudeParams.excludeTopFaceRender) {

                    for (let f=1; f< fLen; f++) {
                        indices[ii++] = faceIndices[0];
                        indices[ii++] = faceIndices[f];
                        indices[ii++] = faceIndices[f+1]
                    }
                }

                // set up lower bottom face indices if needed
                if (extrudeParams.yBottom !== true || !extrudeParams.excludeBottomFaceRender) {
                    for (let f=1; f< fLen; f++) {
                        indices[ii++] = profile.get(faceIndices[f+1]);
                        indices[ii++] = profile.get(faceIndices[f]);
                        indices[ii++] = profile.get(faceIndices[0]);
                    }
                }
            }
        }

        return collector;
    }


     /**
     *
     * @param {HalfEdge} edge A HalfEdge to extrude from (using facing "normal", inwards for HalfEdge)
     * @param {Number} extrudeVal How much to extrude from in negative/positive direction
     * kiv open border parameter
     * @return The sepearte newly-created polygon formed as a result of the extruded edge
     */
    static getNewExtrudeEdgePolygon(edge, extrudeVal, keepVertices=false) {
        let dx = edge.vertex.x - edge.prev.vertex.x;
        let dz = edge.vertex.z - edge.prev.vertex.z;
        let nx = -dz;
        let nz = dx;
        let d = Math.sqrt(nx*nx + nz*nz);
        nx /=d;
        nz /=d;
        let contours = [
            (keepVertices ? edge.prev.vertex : edge.prev.vertex.clone()),
            new Vector3(edge.prev.vertex.x + extrudeVal * nx, edge.prev.vertex.y, edge.prev.vertex.z+  extrudeVal * nz),
            new Vector3(edge.vertex.x + extrudeVal * nx, edge.vertex.y, edge.vertex.z + extrudeVal* nz),
            (keepVertices ? edge.vertex : edge.vertex.clone())
        ];
        return new Polygon().fromContour(contours);
    }

    /**
     * Clones a polygon entirely with an entir enew set of HalfEdges and vertex references
     * @param {Polygon} polygon
     */
    static clonePolygon(polygon, reversed=false) {
        let contours = [];
        let edge = polygon.edge;
        do {
            contours.push(edge.vertex.clone());
            edge = edge.next;
        } while (edge !== polygon.edge);

        if (reversed) contours.reverse();
        return new Polygon().fromContour(contours);
    }

    static countBorderEdges(polygon, countAllEdgeTypes=false) {
        let count = 0;
        let edge = polygon.edge;
        do {
            count += !edge.twin || countAllEdgeTypes ? 1 : 0;
            edge = edge.next;
        } while (edge !== polygon.edge);
        return count;
    }

    static getBorderEdges(polygon) {
        let arr = [];
        let edge = polygon.edge;
        do {
            if (!edge.twin) arr.push(edge);
            edge = edge.next;
        } while (edge !== polygon.edge);
        return arr;
    }

    /**
     * LInk polygons by connecting quad polygons
     * @param {HalfEdge} connector A HalfEdge of a Polygon #1
     * @param {HalfEdge} connector2 A HalfEdge of a Polygon #2
     * @param {Polygon} connector3 This will be the connecting polygon to link the polgons if any, given 2 border edges
     * @return The resulting connecting polygons
     */
    static linkPolygons(connector, connector2=null, connector3=null) {
        let polies = [];
        // kiv todo: connector, connector2 (without connector3) case when needed
        let edge;
        let dx;
        let dz;
        let ex;
        let ez;

        let contours = [];
        let c = 0;
        // naive connection by edge midpoint distance checks
        if (connector3 !== null) {
            let connector3Arr = [connector3];
            c = 0;
            POINT.x = (connector.prev.vertex.x + connector.vertex.x) * 0.5;
            POINT.z = (connector.prev.vertex.z + connector.vertex.z) * 0.5;
            edge = NavMeshUtils.getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);
            // edge to connector


            contours[c++] = edge.prev.vertex;
             contours[c++] = connector.vertex;
              contours[c++] = connector.prev.vertex;
               contours[c++] = edge.vertex;


            let p;
            contours.length = c;
            polies.push(p = new Polygon().fromContour(contours));

            edge.twin = p.edge.prev;
            p.edge.prev.twin = edge;

            p.edge.prev.twin = connector;
            connector.twin = p.edge.prev;

            if (connector2 !== null) {
                let p2;
                c =0;
                POINT.x = (connector2.prev.vertex.x + connector2.vertex.x) * 0.5;
                POINT.z = (connector2.prev.vertex.z + connector2.vertex.z) * 0.5;
                edge = NavMeshUtils.getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);


                contours[c++] = edge.prev.vertex;
                 contours[c++] = connector2.vertex;
                  contours[c++] = connector2.prev.vertex;
                  contours[c++] = edge.vertex;

                contours.length = c;
                polies.push(p2 =  new Polygon().fromContour(contours));

                edge.twin = p.edge.prev;
                 p.edge.prev.twin = edge;

                p2.edge.prev.twin = connector2;
                connector2.twin = p2.edge.prev;
            }
        }
        return polies;
    }

    static getClosestBorderEdgeCenterToPoint(polygons, pt, distLimit=0, ignoreBorder=false) {
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

    static scalePolygons(polygons, xzScale) {
        transformId++;
        let len = polygons.length;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            let edge = polygon.edge;
            do {
                if (edge.vertex !== transformId) {
                    edge.vertex.x *= xzScale;
                    edge.vertex.z *= xzScale;
                    edge.vertex.transformId = transformId;
                }
                edge = edge.next;
            } while (edge !== polygon.edge);
        }
    }


   /**
    * somewhat like divideEdgeByVertex...
    * kiv Later, mainly for navmesh ramp connections between AND Highways/Upper roads with Lower ward floor navmesh, and connectios
    * to remaining part of ramp building area navmesh to lower floor navmesh
    * - Highway (+Upper Ward regions) navmesh
    * - Upper ward road navmesh
    * - Ground navmesh (ground subtracted with buildings and city wall/(grounded pillar extrudes))
    *  (all linked by ramps/ramp-areas)
    *
    *  - (atm. CIty wall navmesh is completely seperate and requires special access)
    * @param {HalfEdge} subjectEdge  The HalfEdge belonging to Polygon #1 to split by connectingEdge
    * @param {HalfEdge} connectingEdge The collinear HalfEdge belonging to Polygon #2
    * @param {HalfEdge} setTwinLinks Whether to set twin links between both polygons
    * @return THe resulting connecting portal HalfEdge from subjectEdge
    */
   static addConnectingPortal(subjectEdge, connectingEdge, setTwinLinks=false) {

   }

    /**
     * Seperates out a list of polygons by bitmask.
     * Vertices belonging to those masked out polygons are made unique and no longer shared by other polygons except among those
     * that have been masked out as well.
     * It Map old vertices to newly cloned unique vertices for entire set of masked out polygons.
     *
     * For simplicity of algorithm, filtered out polygons must then be typically unlinked en-masse if needed, and re-applied into a new seperate navmesh
     * to natively re-create a completely seperate navmesh with correct list of connected edges vs bordered edges.
     *
     * @param {Array} polygons
     * @param {Number} mask Bitmask
     * @param {Boolean|Null} clonePolygons Whether to clone entirely new seperate polygons. If set to Null, will not duplciate vertices as well.
     */
    static filterOutPolygonsByMask(polygons, mask, clonePolygons=false, exactEquals=false, includeUndefined=false) {
        let filteredPolygons = [];
        let len = polygons.length;
        let vertexMap = new Map();
        let contours = clonePolygons ? [] : null;
        let c = 0;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            if ( (polygon.mask === undefined && !includeUndefined)  || (polygon.mask !== undefined && (exactEquals ? polygon.mask !== mask : !(polygon.mask & mask))) ) {
                continue;
            }
            c = 0;
            let edge = polygon.edge;
            do {
                let v;
                if (vertexMap.has(edge.vertex)) {
                    v = vertexMap.get(edge.vertex);
                } else {
                    v = edge.vertex.clone();
                    vertexMap.set(edge.vertex, v);
                }
                if (clonePolygons) {
                    contours[c++] = v;
                } else {
                    if (clonePolygons !== null) edge.vertex = v;
                }
                edge = edge.next;
            } while (edge !== polygon.edge);

            if (clonePolygons) {
                contours.length = c;
                let poly;
                filteredPolygons.push(poly = new Polygon().fromContour(contours));
                if (polygon.yExtrudeParams !== undefined) poly.yExtrudeParams = polygon.yExtrudeParams;
                if (polygon.edgeMask !== undefined) poly.edgeMask = polygon.edgeMask;
                if (polygon.sep !== undefined) poly.sep = polygon.sep;
                poly.mask = polygon.mask;
            } else filteredPolygons.push(polygon);
        }
        return filteredPolygons;
    }

    static adjustAltitudeOfAllPolygons(polygons, altitude) {
        transformId++;
        let len = polygons.length;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            let edge = polygon.edge;
            do {
                if (edge.vertex !== transformId) {
                    edge.vertex.y += altitude;
                    edge.vertex.transformId = transformId;
                }
                edge = edge.next;
            } while (edge !== polygon.edge);
        }
    }

    static setAbsAltitudeOfPolygon(polygon, altitude) {
        let edge = polygon.edge;
        do {
            edge.vertex.y = altitude;
            edge = edge.next;
        } while (edge !== polygon.edge);
    }

    static setAbsAltitudeOfAllPolygons(polygons, altitude) {
       let len = polygons.length;
       for (let i=0; i<len; i++) {
        let polygon = polygons[i];
        let edge = polygon.edge;
        do {
            edge.vertex.y = altitude;
            edge = edge.next;
        } while (edge !== polygon.edge);
       }
    }

    static checkAllValidPolygons(polygons) {
         let regions = polygons.regions || polygons;
         let len = regions.length;
        for (let i=0; i< len; i++) {
            // consider..create new one ?
           if (!regions[i].convex(true)) {
               return false;
           }
        }
        return true;
     }

    static unlinkPolygons(polygons) {
        let regions = polygons.regions || polygons;
        let len = regions.length;
        for (let i=0; i< len; i++) {
            let r = regions[i];
            let edge = r.edge;
            do {
                edge.twin = null;
                edge = edge.next;
            } while( edge !== r.edge)
        }
        return regions;
    }

    static weldVertices(navmesh) {
        let regions = navmesh.regions || navmesh;
        let len = regions.length;
        let map = new Map();
        let weldCount = 0;
        let r;
        let edge;
        for (let i=0; i< len; i++) {
            r = regions[i];
            edge = r.edge;
            do {
                let key = edge.vertex.x + "," +edge.vertex.y + ","+edge.vertex.z;
                if (!map.has(key)) {
                    map.set(key, edge.vertex);
                } else {
                    weldCount += edge.vertex !== map.get(key);
                    edge.vertex = map.get(key);
                }
                edge = edge.next;
            } while (edge !== r.edge)
        }
    }

    static divideEdgeByVertex(splitVertex, edge) {
        let halfEdge = new HalfEdge(splitVertex);
        halfEdge.polygon = edge.polygon;

        halfEdge.prev = edge.prev;
        edge.prev.next = halfEdge;

        halfEdge.next = edge;
        edge.prev = halfEdge;
    }

    static adjustAltitudeOfPolygon(polygon, altitude) {
        let edge = polygon.edge;
        do {
            edge.vertex.y += altitude;
            edge = edge.next;
        } while (edge !== polygon.edge);
    }

    static seperateMarkedPolygonsVertices(polygons) {
        let len = polygons.length;
        for (let i=0;i<len; i++) {
            let polygon = polygons[i];
            if (!polygon.sep) continue;
            let edge = polygon.edge;
            do {
                edge.vertex = edge.vertex.clone();
                edge = edge.next;
            } while (edge !== polygon.edge)
        }
        return polygons;
    }

   /**
    * Note: This function is 2D and assumed to work only on x and z coordinates of polygons
    * @param {Vertex} vertex Vertex is assumed to already lie directly on given edge split
    * @param {Vertex} fromEdge The edge containing the vertex belonging to polygon to be splitted, and whose vertex is where to split the polygon from
    * @return [Polygon] Array of 2 polygons
    */
    static dividePolygonByVertices2D(splitVertex, fromEdge, rightHanded=false) {
        let fromVertex = fromEdge.vertex;
        let dx = splitVertex.x - fromVertex.x;
        let dz = splitVertex.z - fromVertex.z;
        let handedness = rightHanded ? 1 : -1;
        let nx = -dz * handedness;
        let nz = dx * handedness;
        let offset = nx * fromVertex.x + nz * fromVertex.z;
        let polyContours = [fromVertex, splitVertex];
        let polyContours2 = [splitVertex, fromVertex];
        let edge = fromEdge.next;
        do {
            let v = edge.vertex;
            if (nx * v.x + nz * v.z >= offset) {
                polyContours.push(v);
            } else {
                polyContours2.push(v);
            }
            edge = edge.next;
        } while (edge !== fromEdge);

        if (polyContours.length < 3 || polyContours2.length < 3) {
            console.warn("dividePolygonByVertices2D ERROR:", polyContours, polyContours2);
            return null;
        }



        let result =  [new Polygon().fromContour(polyContours), new Polygon().fromContour(polyContours2)];
        return result;
    }

    static dividePolygonByVertices(splitVertex, fromEdge) {
        let fromVertex = fromEdge.vertex;
        PLANE.normal.crossVectors(fromEdge.polygon.plane.normal, new Vector3().subVectors(splitVertex, fromVertex));
        PLANE.fromNormalAndCoplanarPoint(PLANE.normal, fromVertex);

        let polyContours = [fromVertex, splitVertex];
        let polyContours2 = [splitVertex, fromVertex];
        let edge = fromVertex.next;
        do {
            let v = edge.vertex;
            if (PLANE.normal.dot(v)>=PLANE.constant) {
                polyContours.push(v);
            } else {
                polyContours2.push(v);
            }
            edge = edge.next;
        } while (edge !== fromVertex);

        if (polyContours.length < 3 || polyContours2.length < 3) {
            console.warn("dividePolygonByVertices ERROR:", polyContours, polyContours2);
            return null;
        }

        return [new Polygon().fromContour(polyContours), new Polygon().fromContour(polyContours2)];
    }


    // KEY navmesh methods

    static getVertexListFromPolygons(polygons) {
        let fullSet = new Set();
        let len = polygons.length;
        for (let i = 0; i<len ;i++) {
           let p = polygons[i];
           let edge = p.edge;
            do {
                fullSet.add(edge.vertex);
                edge = edge.next;
            } while (edge !== p.edge);
        }
        return Array.from(fullSet);
    }

    static weldNewPolygonToVertexList(polygon, vertexList, is2D=false, threshold=Infinity) {
        let contours = [];
        let edge = polygon.edge;
        let v;
        let dx;
        let dy;
        let dz;
        let d;
        let closest;
        let closestV;
        let len = vertexList.length;
        do {
            v = edge.vertex;
            closest = Infinity;
            closestV = null;
            for (let i = 0; i < len; i++) {
                let v2 = vertexList[i];
                dx = v2.x - v.x;
                dy = !is2D ? v2.y - v.y : 0;
                dz = v2.z - v.z;
                d = dx*dx + dy*dy + dz*dz;
                if (d < closest && d < threshold) {
                    closest = d;
                    closestV = v2;
                }
            }
            contours.push(closestV !== null ? closestV : v);
            edge = edge.next;
        } while(edge !== polygon.edge)

        return new Polygon().fromContour(contours);
    }




    /**
     * Retrieve contigious sets of polygons from a list of polygons or from navmesh itself
     * @param {NavMesh|[Polygon]} navmesh
     * @param {Number} getBorders  Whether to include borders. Zero to exclude entirely. '1' to include borders amd ordered. '2' to include borders but unordered.
     * @return An array of navmesh island definitions: vertices and polygons...and borders (if specified to be included)
     */
    static getNavmeshIslands(navmesh, getBorders=0) {
        let polygons = navmesh.regions ? navmesh.regions : navmesh;

        var stack = [];
        var si;
        var i = 0;
        var len = polygons.length;
        var edge;
        var p;

        var islands = [];

        var poliesInIsland;
        var vertsInIsland;
        var bordersInIsland;
        var time = 0;

        while (i < len) {
            vertsInIsland = [];
            poliesInIsland= [];
            if (getBorders) bordersInIsland = [];

            // DFS
            si = 0;
            stack[si++] = polygons[i];
            polygons[i].done = true;
            while(--si > -1) {
                p = stack[si];
                poliesInIsland.push(p);
                edge = p.edge;
                do {
                    if (edge.twin && !edge.twin.polygon.done ) {

                            stack[si++] = edge.twin.polygon;
                            edge.twin.polygon.done = true;

                    }
                    if (getBorders && !edge.twin && edge.time !== time) {
                        bordersInIsland.push(edge);
                        edge.time = time;
                    }
                    if (edge.vertex.time !== time) {
                        vertsInIsland.push(edge.vertex);
                        edge.vertex.time = time;
                    }
                    edge = edge.next;
                }   while (edge !== p.edge);
            }

            let isle = {polygons:poliesInIsland, vertices:vertsInIsland};
            if (getBorders) {
                isle.borders = bordersInIsland;
            }
            islands.push(isle);

            time++;

            while (i < len && polygons[i].done) {
                i++;
            }
        }


        if (getBorders === 1) {
            islands.forEach((isle)=> {
                isle.borders = this.getOrderedIslandBorders(isle.borders);
            });
        }
        return islands;
    }

    /**
     * Attempts to create a single loop ordered set of borders from all collected borders from a polygon island.
     * Note that it is naively assumed all borders of the island already form a clean (single-direction) loop without branching.
     * @param {[HalfEdge]} borders
     * @return [HalfEdge] A new array consisting of the ordered set of borders
     */
    static getOrderedIslandBorders(borders) {
        let map = new Map();
        let len;

        let b;
        len = borders.length;
        for (let i =0; i< len; i++) {
            b = borders[i];
            map.set(b.prev.vertex, b);
        }
        b = borders[0];
        let startBorder = b;
        let arr = [b];
        b = map.get(b.vertex);
        do {
            arr.push(b);
            b = map.get(b.vertex);
        } while (b !== startBorder)
        return arr;
    }


    /**
     * Get obstructing obstacle polygon over a given flat yPosition surface given a sloping polgon.
     * Note that for any polygon area that lies below yPosition + agentHeight, assumed blocking always.
     * Only polygon volume of y >= agentHeight + yPosition considered non-blocking/obstructing. If y goes below yPosition itself,
     * by default, no ground plane clipping is done, so if obstructing volume goes below ground yPos, it's still counted
     * as a projected blocking polygon if it's obstructing the floor itself even though it's buried underneath it (ie.  not clipped by yPos plane).
     * (future consideration: feature to auto-clip polygon by yPosition plane as well, or a seperate function for that?)
     * @param {Polgon} polygon A typically sloping polygon in relation to flat y ground postion
     * @param {Number} yPos The flat y position ground surface in relation to polygon
     * @param {Number} agentHeight The agent height used to represent required height clearance from the given polyon
     * @return A new clipped polygon based off the obstructed height clearance position
     */
    static getObstructingPolyOverFlatLevel(polygon, yPos, agentHeight) {
        let contours = [];
        let edge = polygon.edge;

        let heightLimit = yPos + agentHeight;
        let lastBlockedPoint = null;

        // y = mx + c;
        // heightLimit <= mx + c
        //
        let dx;
        let dy;
        let dz;

        let t;
        let startBlockedState;
        let endBlockedState;
        do {
            startBlockedState = edge.prev.vertex.y < heightLimit;
            endBlockedState = edge.vertex.y < heightLimit;

            if (endBlockedState !== startBlockedState) {
                // clipping of edge required on either start/or end
                dx = edge.vertex.x - edge.prev.vertex.x;
                dz = edge.vertex.z - edge.prev.vertex.z;
                dy = edge.vertex.y - edge.prev.vertex.y;

                t = (edge.prev.vertex.y - heightLimit) / -dy;

                if (!startBlockedState ) { // clip from start
                    // assumed/assert dy < 0
                    if (dy >= 0) throw new Error("Gradient sign assertion failed! dy < 0");
                    contours.push( new Vector3(edge.prev.vertex.x + t * dx, heightLimit, edge.prev.vertex.z + t * dz) );
                    contours.push(edge.vertex.clone());

                } else { // clip from end
                    // assumed/assert dy > 0
                    if (dy <= 0) throw new Error("Gradient sign assertion failed! dy > 0");
                    contours.push( new Vector3(edge.prev.vertex.x + t * dx, heightLimit, edge.prev.vertex.z + t * dz) );
                }
            } else if (startBlockedState) { // thus also === endBlockedState
                contours.push(edge.vertex.clone());
            }

            edge = edge.next;
        } while ( edge !== polygon.edge)
        return contours.length >= 3 ? new Polygon().fromContour(contours) : null;
    }

    /**
     * Calculate offset/corner projections necessary for navmesh minowski-like operations
     * @param {NavMesh}  navMesh
     * @param {Number}  inset   The amount to inset navmesh by
     * @param {Number}  minChamferLength   The minimum chamfer distance
     * @return A Map to map vertices of current navmesh to their respective edge pairs
     */
    static getBorderEdgeOffsetProjections(navMesh, inset, minChamferDist = 1e-5) {

        const LINE = new LineSegment();
        const LINE2 = new LineSegment();
        const LINE_RESULT = {};
        const minChamferDistSq = minChamferDist*minChamferDist;
        // TODO: project zero y values for actual 3d representation

        let resultMap = new Map();
        // offseted vertex map

        // vertex to incident [edges] map
        var vertexToEdgesMap = new Map();
        let len = navMesh._borderEdges.length;
        var e;
        for(let i=0; i<len; i++) {
            e = navMesh._borderEdges[i];
            e.index = i;
            if (!vertexToEdgesMap.has(e.vertex)) {
                vertexToEdgesMap.set(e.vertex, [e]);
            } else {
                vertexToEdgesMap.get(e.vertex).push(e);
            }
            if (!vertexToEdgesMap.has(e.prev.vertex)) {
                vertexToEdgesMap.set(e.prev.vertex, [e]);
            } else {
                vertexToEdgesMap.get(e.prev.vertex).push(e);
            }
            let dx = e.vertex.x - e.prev.vertex.x;
            let dz = e.vertex.z - e.prev.vertex.z;
            let d = Math.sqrt(dx*dx + dz*dz);
            dx/=d;
            dz/=d;
            setToPerp(e.dir = new Vector3(dx, 0, dz), e.normal = new Vector3());
            e.normal.w = e.vertex.x * e.normal.x + e.vertex.z * e.normal.z;
        }


        let arr;
        let arr2;
        let visitedEdgePairs = new Set();

        // iterate through each border edge to expand and stretch
        for(let i=0;i<len; i++) {
            e = navMesh._borderEdges[i];
            e.value = new LineSegment(new Vector3(e.prev.vertex.x + e.normal.x * inset, 0, e.prev.vertex.z + e.normal.z * inset)
            , new Vector3(e.vertex.x + e.normal.x * inset, 0, e.vertex.z + e.normal.z * inset));
            e.value.from.t = 0;
            e.value.to.t = 0;
            // nice to have: get proper height value of vertex over edge's triangle polygon
        }

        let plane = new Vector3();
        let tPlane;
        let snapT;
        let deltaLength;
        let splitVertex;
        let splitVertex2;
        let edgePairKey;
        let intersectPtOrChamfer;
        //let neighborEdge;
        let neighborEdgeArr;
        let coincideArr;

        for (let i =0; i<len; i++) {
            e = navMesh._borderEdges[i];

           let arr;
            // head vertex on consiered edge
           arr = vertexToEdgesMap.get(e.vertex);
           neighborEdgeArr = findNeighborEdgeCompHeadArr(arr, e, e.vertex, visitedEdgePairs, len)

           if (neighborEdgeArr) { // forwardDir for e.vertex
                neighborEdgeArr.forEach( (neighborEdge) => {
                // edgePairKey = getKeyEdgePair(e, neighborEdge, len);
                //
                //if (!visitedEdgePairs.has(edgePairKey)) { //  !(e.vertex.result || e.vertex.chamfer)
                    visitedEdgePairs.add(edgePairKey);
                        LINE.from.copy(e.value.from);
                        LINE.to.copy(e.value.to);

                        LINE2.from.copy(neighborEdge.value.from);
                        LINE2.to.copy(neighborEdge.value.to);

                        // if intersected neighborLine
                        if (LINE.getIntersects(LINE2, LINE_RESULT)) {
                            LINE.at(LINE_RESULT.r, intersectPtOrChamfer = new Vector3());
                            intersectPtOrChamfer.t = (LINE_RESULT.r - 1) * length2DSegment(LINE);
                            if (!resultMap.has(e.vertex)) {
                                resultMap.set(e.vertex, [e, neighborEdge]);
                                e.vertex.result = intersectPtOrChamfer;
                            } else {
                                resultMap.get(e.vertex).push(e, neighborEdge);
                                if (!e.vertex.resultArr) e.vertex.resultArr = [];
                                e.vertex.resultArr.push(intersectPtOrChamfer);
                            }
                        } else {
                            let detectedMirroredEdge = false;
                            if (LINE_RESULT.coincident && !(detectedMirroredEdge=isMirroredEdge(e, neighborEdge))) {
                                intersectPtOrChamfer = new Vector3(e.value.to.x, e.value.to.y, e.value.to.z);
                                intersectPtOrChamfer.t = 0;
                                if (!resultMap.has(e.vertex)) {
                                    resultMap.set(e.vertex, coincideArr=[e, neighborEdge]);
                                    e.vertex.result = intersectPtOrChamfer;
                                   coincideArr.coincident = 1;
                                } else {
                                    (coincideArr = resultMap.get(e.vertex)).push(e, neighborEdge);
                                    if (!e.vertex.resultArr) e.vertex.resultArr = [];
                                    e.vertex.resultArr.push(intersectPtOrChamfer);
                                    coincideArr.coincident |= (1 << (e.vertex.resultArr.length));
                                }
                            }
                            else {
                                snapT = (LINE_RESULT.r - 1) * (deltaLength = length2DSegment(LINE));
                                if (snapT < 0) snapT = 0;
                                //if (snapT > inset*2) snapT = inset*2;
                                plane = calcPlaneBoundaryBetweenEdges(e, neighborEdge, e.vertex, inset, plane);
                                tPlane = getIntersectionTimeToPlaneBound(LINE.to, e.dir.x, e.dir.z, plane);
                                //if (detectedMirroredEdge) console.log("times:" + tPlane + ' vs ' + snapT + " | " +plane.x + ", "+plane.z + "," +plane.w);
                                splitVertex = new Vector3(LINE.to.x, 0, LINE.to.z);
                                splitVertex2 = new Vector3(LINE2.from.x, 0, LINE2.from.z);
                                splitVertex.t = 0;
                                splitVertex2.t = 0;
                                if (tPlane > 0 && ( (LINE_RESULT.r > 1 && tPlane < snapT) || detectedMirroredEdge)) { // && Math.abs(neighborEdge.dir.dot(e.dir)) < 1-1e-7
                                    //console.log(tPlane + ' vs ' + snapT + ' >>>' + deltaLength + ', ' + LINE_RESULT.r);
                                    splitVertex.x = LINE.to.x + tPlane * e.dir.x;
                                    splitVertex.z = LINE.to.z + tPlane * e.dir.z;
                                    splitVertex2.x = LINE2.from.x + tPlane * -neighborEdge.dir.x;
                                    splitVertex2.z = LINE2.from.z + tPlane * -neighborEdge.dir.z;
                                    splitVertex.t = tPlane;
                                    splitVertex2.t = tPlane;
                                }
                                intersectPtOrChamfer = new LineSegment(splitVertex, splitVertex2);
                                if (snapT > inset*2) snapT = inset*2;
                                intersectPtOrChamfer.snap =  new Vector3(LINE.to.x + snapT * e.dir.x, 0, LINE.to.z + snapT * e.dir.z);
                                if (!resultMap.has(e.vertex)) {
                                    e.vertex.chamfer = intersectPtOrChamfer;
                                    resultMap.set(e.vertex, [e, neighborEdge]);
                                } else {
                                    resultMap.get(e.vertex).push(e, neighborEdge);
                                    if (!e.vertex.resultArr) e.vertex.resultArr = [];
                                    e.vertex.resultArr.push(intersectPtOrChamfer);
                                }
                            }
                        }
                    //}
                });
           } else {
                console.warn("Failed to find complementary neighbnor edge!", e);
                // throw new Error("Failed to find complementary neighbnor edge!");
           }



        }

        // validate resultMap, resolve extents and weld
        let errorCount = 0;
        resultMap.forEach((edges, vertex) => {
            if (vertex.chamfer) {
                // todo: check if close enough chamfer to consider proper welding as vertex.result instead
                if (lengthSq2DSegment(vertex.chamfer) <= minChamferDistSq) { // welded chamfer vertex result
                    vertex.result = vertex.chamfer.snap;
                    vertex.result.welded = true;
                    vertex.chamfer = null;
                    edges[0].value.to = vertex.result;
                    edges[1].value.from = vertex.result;

                } else {
                     // chamfer vertex
                    edges[0].value.to = vertex.chamfer.from;
                    edges[1].value.from = vertex.chamfer.to;
                }
            } else { // intersected vertex
                edges[0].value.to = vertex.result;
                edges[1].value.from = vertex.result;
            }

            if (vertex.resultArr !== undefined) {
                  vertex.resultArr.forEach((result, index)=> {
                    if (result instanceof LineSegment) { // assumed chamfer joint segment
                        if (lengthSq2DSegment(result) <= minChamferDistSq) { // welded chamfer vertex result
                            result = result.snap;
                            result.welded = true;
                            if (edges[0].value.to.t < result.t ) {
                                edges[0].value.to = result;
                            }
                            if (edges[1].value.from.t < result.t) {
                                edges[1].value.from = result;
                            }
                            vertex.resultArr[index] = result;
                        } else {
                             if (edges[0].value.to.t < result.from.t ) {
                                edges[0].value.to = result.from;
                                edges[1].value.from = result.to;
                            }

                        }
                    } else { // assumed Vector3 intersection point
                        if (edges[0].value.to.t < result.t ) {
                            edges[0].value.to = result;
                        }
                        if (edges[1].value.from.t < result.t) {
                            edges[1].value.from = result;
                        }
                    }
                  });
            }
        });
        if (errorCount > 0) {
            throw new Error("Validation failed!");
        }


        return resultMap;
    }


     /* // yagni
    static patchHoles(navmesh, holesAdded) {
        if (!holesAdded) holesAdded = [];

        // if full navmesh reference is passed, then will also push added holes into navmesh regions as walkable areas and update navmesh's graph accordingly
        let isUsingFullNavmesh = !!navmesh.regions;

        let regions = isUsingFullNavmesh ? navmesh.regions : navmesh;
        let len = regions.length;
        let r;
        let edge;
        let map = new Map();
        for (let i=0; i<len; i++) {
            r = regions[i];
            edge = r.edge;
            do {
                if (edge.twin === null) {
                    if (map.has(edge.prev.vertex)) {
                        map.get(edge.prev.vertex).push(edge);
                    }
                    else map.set(edge.prev.vertex, [edge]);
                }
                edge = edge.next;
            } while (edge !== r.edge)
        }

        let builtContour = [];
        let bi;
        let dfs = [];
        let di;
        for (let i=0; i<len; i++) {
            r = regions[i];
            edge = r.edge;
            do {
                if (edge.twin === null) {
                    bi =  searchEdgeList(map, builtContour, edge);

                    //e === edge &&
                    if ( bi>=3) {
                        builtContour.length = bi;
                        //console.log("Adding hole");
                        let p;
                        holesAdded.push( p = new Polygon().fromContour(builtContour.map((e)=>{return e.vertex})) );
                        p.holed = true;

                        // kiv todo: link twins  newly added polygon's edges

                        if (isUsingFullNavmesh) {
                            // link respective polygon holes to full navmesh to connect it. add arc to graph.
                        }
                    }
                }

                edge = edge.next;
            } while (edge !== r.edge)
        }
        return holesAdded;
    }
    */



}

export { NavMeshUtils };
