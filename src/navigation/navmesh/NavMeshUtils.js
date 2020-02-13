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
};

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
    static filterOutPolygonsByMask(polygons, mask, clonePolygons=false, exactEquals=false) {
        let filteredPolygons = [];
        let len = polygons.length;
        let vertexMap = new Map();
        let contours = clonePolygons ? [] : null;
        let c = 0;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            if (polygon.mask === undefined || (exactEquals ? polygon.mask !== mask : !(polygon.mask & mask)) ) {
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
        console.log("NAvmesh Welded vertices count:" + weldCount);
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
        console.log(result[0].convex(true), result[1].convex(true))
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



    /**
     *
     * @param {NavMesh}  navMesh
     * @param {Number}  inset   The amount to inset navmesh by
     * @return A Map to map vertices/borders of current navmesh with insetted/offseted lines
     */
    static getBorderEdgeOffsetProjections(navMesh, inset) {

        const LINE = new LineSegment();
        const LINE2 = new LineSegment();
        const LINE_RESULT = {};

        let resultMap = new Map();
        // offseted vertex map

        // vertex to incident [edges] map
        var vertexToEdgesMap = new Map();
        let len = navMesh._borderEdges.length;
        var e;
        for(let i=0; i<len; i++) {
            e = navMesh._borderEdges[i];
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
        }

        let arr;
        let arr2;

          for(let i=0; i<len; i++) {
            let edge = navMesh._borderEdges[i];
             if (vertexToEdgesMap.has(edge.prev.vertex)) {

                arr = vertexToEdgesMap.get(edge.prev.vertex);
                if (arr.length >=2) {

                    if (arr.length !== 2) {
                    arr = arr.filter(function(e){return e.polygon===edge.polygon;});
                       // console.log("FILTERING!!");
                    }
                    if (arr.length !==2) {
                    // throw new Error( "COULD NOT reduce to 2 common edges for border!");
                        //console.warn( "COULD NOT reduce to 2 common edges for border!");

                    }
                }
            } else {
                throw new Error( "Isolated border found..should not happen?");
            }


            if (vertexToEdgesMap.has(edge.vertex)) {

                arr2 = vertexToEdgesMap.get(edge.vertex);
                if (arr2.length >=2) {

                    if (arr2.length !== 2) {
                    arr2 = arr2.filter(function(e){return e.polygon===edge.polygon;});
                        //console.log("FILTERING!!");
                    }
                    if (arr2.length !==2) {
                    // throw new Error( "222; COULD NOT reduce to 2 common edges for border!");
                       // console.warn( "222; COULD NOT reduce to 2 common edges for border!");
                        if (arr.length !==2) {
                           // console.warn( "222; COULD NOT reduce to 2 common edges for border!");

                        }
                    }
                }
            } else {
                throw new Error( "222; Isolated border found..should not happen?");
            }

        }

        // iterate through all vertices incident to border edges to set up their vertex normal plane boundaries
        vertexToEdgesMap.forEach((edges, vertex)=> {
           let len = edges.length;
           let plane = new Vector3(0, 0, 0);
           for (let i = 0; i< len; i++) {
                e = edges[i];
                plane.x += e.normal.x;
                plane.z += e.normal.z;
           }
           plane.x /= len;
           plane.z /= len;

           // collinear edges case on opposite directions
           if (plane.x * plane.x + plane.z * plane.z < 1e-7) {
                let sampleEdge = edges[0];
                plane.copy(sampleEdge.dir).multiplyScalar(sampleEdge.vertex === vertex ? 1 : -1);
           }
           let vx = vertex.x + plane.x * inset;
           let vz = vertex.z + plane.y * inset;
           plane.x = -plane.x;
           plane.z = -plane.z;
           plane.w = vx * plane.x + vz * plane.z;

           vertex.plane = plane;


           // resultMap.set(vertex, edges[0]);  // testing

        });

        // iterate through each border edge to expand and stretch
        for(let i=0;i<len; i++) {
            e = navMesh._borderEdges[i];
            e.vertex.value = new Vector3(e.vertex.x + e.normal.x * inset, 0, e.vertex.z + e.normal.z * inset);
            e.prev.vertex.value = new Vector3(e.prev.vertex.x + e.normal.x * inset, 0, e.prev.vertex.z + e.normal.z * inset);
            // nice to have: get proper height value of vertex over edge's triangle polygon
        }

        for (let i =0; i<len; i++) {
            e = navMesh._borderEdges[i];
            let neighborEdge;
            let arr;
           arr = vertexToEdgesMap.get(e.vertex);
           neighborEdge = arr[0] === e ? arr[1] : arr[0];
           if (neighborEdge) { // forwardDir for e.vertex
                if (!e.vertex.result) {
                    LINE.from.copy(e.prev.vertex.value);
                    LINE.to.copy(e.vertex.value);

                    LINE2.from.copy(neighborEdge.prev.vertex.value);
                    LINE2.to.copy(neighborEdge.vertex.value);

                    // if intersected neighborLine
                    if (LINE.getIntersects(LINE2, LINE_RESULT)) {
                        LINE.at(LINE_RESULT.r, e.vertex.result = new Vector3());
                        console.log('got intersect');
                    } else {
                        // TODO normal plane intersection and consider weld or chamfer later
                        e.vertex.result = new Vector3().copy(e.vertex);
                        resultMap.set(e.vertex, e);  // testing
                        console.log('no intersect');
                    }
                }

           } else {
                throw new Error("Failed to find neighbnor edge!");
           }
            // consider e.vertex stretch VERSUS neighboring borderEdge or respective plane bonudary


            // consider e.prev.vertex stretch VERSUS borderEdge or respectivee plane boundary
            arr = vertexToEdgesMap.get(e.prev.vertex);
           neighborEdge = arr[0] === e ? arr[1] : arr[0];
           if (neighborEdge) { // reverseDir for e.prev.vertex
                if (!e.prev.vertex.result) {
                    LINE.from.copy(e.vertex.value);
                    LINE.to.copy(e.prev.vertex.value);

                    LINE2.from.copy(neighborEdge.prev.vertex.value);
                    LINE2.to.copy(neighborEdge.vertex.value);

                    if (LINE.getIntersects(LINE2, LINE_RESULT)) {
                        LINE.at(LINE_RESULT.r, e.prev.vertex.result = new Vector3());

                    } else {
                        // TODO normal plane intersection and consider weld or chamfer later
                        //console.warn("SHOULD NOT HAPPEN");
                        e.prev.vertex.result = new Vector3().copy(e.prev.vertex);
                        resultMap.set(e.prev.vertex, e);  // testing
                    }
                }
           } else {
              throw new Error("Failed to find neighbnor edge 222!");
           }


        }


        return resultMap;
    }

}

export { NavMeshUtils };
