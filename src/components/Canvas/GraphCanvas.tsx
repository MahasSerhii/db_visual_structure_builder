import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useGraph } from '../../context/GraphContext';
import { NodeData, EdgeData, Comment } from '../../utils/types';
import { useToast } from '../../context/ToastContext';
import { EditEdgeModal } from '../Modals/EditEdgeModal';
import { X, Lock, Unlock, MessageSquare, Trash2, Palette } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';
import './animations.css';

const MIN_BOX_WIDTH = 200;
const CONST_HEADER_HEIGHT = 28;
const PROP_HEIGHT = 20;
const BOTTOM_PADDING = 10;

// Type definitions for D3
type D3Node = NodeData & d3.SimulationNodeDatum;
type D3Edge = Omit<EdgeData, 'source' | 'target'> & {
    source: D3Node;
    target: D3Node;
};

interface GraphCanvasProps {
    onNodeClick?: (node: NodeData) => void;
    isCommentMode?: boolean;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ onNodeClick, isCommentMode = false }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);
    const { nodes, edges, comments, updateNode, updateEdge, addEdge, deleteEdge, addComment, updateComment, deleteComment, config, activeCommentId, setActiveCommentId, currentProjectId, updateProjectBackground, userProfile } = useGraph();
    const { showToast } = useToast();
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    
    // Refs for D3 Event Listeners (to avoid stale closures without re-binding events constantly)
    const updateNodeRef = useRef(updateNode);
    const updateEdgeRef = useRef(updateEdge);
    const addCommentRef = useRef(addComment);
    const setActiveCommentIdRef = useRef(setActiveCommentId);
    const configRef = useRef(config);
    const userProfileRef = useRef(userProfile);

    useEffect(() => { updateNodeRef.current = updateNode; }, [updateNode]);
    useEffect(() => { updateEdgeRef.current = updateEdge; }, [updateEdge]);
    useEffect(() => { addCommentRef.current = addComment; }, [addComment]);
    useEffect(() => { setActiveCommentIdRef.current = setActiveCommentId; }, [setActiveCommentId]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

    // D3 Setup & Re-rendering
    useEffect(() => {
        if(!svgRef.current) return;
        // Update Cursor
        svgRef.current.style.cursor = isCommentMode 
            ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${encodeURIComponent('#8B5CF6')}" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>') 0 32, auto`
            : "default";
    }, [isCommentMode]);

    const getNodeHeight = useCallback((node: NodeData) => {
        const propsCount = node.props ? node.props.length : 0;
        return CONST_HEADER_HEIGHT + (propsCount * PROP_HEIGHT) + BOTTOM_PADDING;
    }, []);

    const getPropYOffset = useCallback((node: NodeData, propName?: string) => {
        if (!propName) return getNodeHeight(node) / 2; 
        const index = node.props ? node.props.findIndex(p => p.name === propName) : -1;
        if (index === -1) return getNodeHeight(node) / 2;
        return CONST_HEADER_HEIGHT + (index * PROP_HEIGHT) + (PROP_HEIGHT / 2);
    }, [getNodeHeight]);

    // --- CURVE CALCULATION ---
    const drawCurve = useCallback((d: D3Edge) => {
        if (!d.source || !d.target || typeof d.source !== 'object' || typeof d.target !== 'object') return "";
        // d.source and d.target are D3Node objects here, which extend NodeData
        // We cast because TS might sometimes see them as SimulationNodeDatum if not strictly typed in D3 setup
        const source = d.source;
        const target = d.target;
        
        if (typeof source.x !== 'number' || typeof target.x !== 'number') return "";

        const H_source = getNodeHeight(source);
        const H_target = getNodeHeight(target);

        const sLeft = source.x - MIN_BOX_WIDTH / 2;
        const sTop = source.y - H_source / 2;
        const tLeft = target.x - MIN_BOX_WIDTH / 2;
        const tTop = target.y - H_target / 2;

        const sPropY = getPropYOffset(source, d.sourceProp);
        const tPropY = getPropYOffset(target, d.targetProp);

        let sx, tx;
        let c1x, c1y, c2x, c2y;

        const sy = sTop + sPropY;
        const ty = tTop + tPropY;

        const isTargetRight = target.x > source.x;

        if (isTargetRight) {
            sx = sLeft + MIN_BOX_WIDTH; 
            tx = tLeft; 
        } else {
            sx = sLeft; 
            tx = tLeft + MIN_BOX_WIDTH; 
        }

        const dist = Math.abs(tx - sx);
        const curvature = 0.5;
        
        if (isTargetRight) {
             c1x = sx + dist * curvature;
             c1y = sy;
             c2x = tx - dist * curvature;
             c2y = ty;
        } else {
             const minCurve = 50;
             c1x = sx - Math.max(dist * curvature, minCurve);
             c1y = sy;
             c2x = tx + Math.max(dist * curvature, minCurve);
             c2y = ty;
        }

        if (source.id === target.id) {
            sx = sLeft + MIN_BOX_WIDTH;
            tx = sx;
            const loopSize = 50;
            c1x = sx + loopSize;
            c1y = sy - loopSize;
            c2x = tx + loopSize;
            c2y = ty + loopSize;
        }

        return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
    }, [getPropYOffset, getNodeHeight]);

    // Calculate Center for Label
    const getLabelPos = useCallback((d: D3Edge) => {
         if (!d.source || !d.target || typeof d.source.x !== 'number' || typeof d.target.x !== 'number') return {x:0, y:0};
         
         const source = d.source;
         const target = d.target;

         const H_source = getNodeHeight(source);
         const H_target = getNodeHeight(target);
         
         const sLeft = source.x - MIN_BOX_WIDTH / 2;
         const sTop = source.y - H_source / 2;
         const tLeft = target.x - MIN_BOX_WIDTH / 2;
         const tTop = target.y - H_target / 2;
         const sPropY = getPropYOffset(source, d.sourceProp);
         const tPropY = getPropYOffset(target, d.targetProp);
         
         const sy = sTop + sPropY;
         const ty = tTop + tPropY;
         const isTargetRight = target.x > source.x;
         const sx = isTargetRight ? sLeft + MIN_BOX_WIDTH : sLeft;
         const tx = isTargetRight ? tLeft : tLeft + MIN_BOX_WIDTH;
         const dist = Math.abs(tx - sx);
         
         let c1x, c1y, c2x, c2y;
         if (isTargetRight) {
             c1x = sx + dist * 0.5; c1y = sy;
             c2x = tx - dist * 0.5; c2y = ty;
         } else {
             const minCurve = 50;
             c1x = sx - Math.max(dist * 0.5, minCurve); c1y = sy;
             c2x = tx + Math.max(dist * 0.5, minCurve); c2y = ty;
         }

         const t = 0.5;
         const x = Math.pow(1-t,3)*sx + 3*Math.pow(1-t,2)*t*c1x + 3*(1-t)*Math.pow(t,2)*c2x + Math.pow(t,3)*tx;
         const y = Math.pow(1-t,3)*sy + 3*Math.pow(1-t,2)*t*c1y + 3*(1-t)*Math.pow(t,2)*c2y + Math.pow(t,3)*ty;
         
         return {x, y};

    }, [getNodeHeight, getPropYOffset]);

    // Trigger Shake
    const triggerShake = (nodeId: string) => {
        const el = gRef.current?.querySelector(`.node-group[data-id="${nodeId}"]`);
        if (el) {
            el.classList.remove('shaking');
            void (el as HTMLElement).offsetWidth; // Trigger reflow
            el.classList.add('shaking');
            // Remove after animation
            setTimeout(() => el.classList.remove('shaking'), 500);
        }
    };

    const isLocked = useCallback((d: D3Edge) => {
        return d.source?.locked || d.target?.locked;
    }, []);


    const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!svgRef.current || !gRef.current) return;
        const svg = d3.select(svgRef.current);
        const g = d3.select(gRef.current);
        const roomKey = currentProjectId || 'local';

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                // Debounce Save Viewport
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = setTimeout(() => {
                    const { k, x, y } = event.transform;
                    localStorage.setItem(`graph_viewport_${roomKey}`, JSON.stringify({ k, x, y }));
                }, 500);
            });
        svg.call(zoom).on("dblclick.zoom", null); 
        
        // Restore Viewport
        const savedView = localStorage.getItem(`graph_viewport_${roomKey}`);
        if (savedView) {
            try {
                const { k, x, y } = JSON.parse(savedView);
                svg.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(k));
            } catch { /* ignore */ }
        }
        
        // Double click for traditional shift+dblclick
        svg.on("dblclick", function(event) {
            if (event.shiftKey) {
                 const [x, y] = d3.pointer(event, gRef.current);
                 const id = crypto.randomUUID();
                 addCommentRef.current({
                     id,
                     x, y,
                     content: "New comment",
                     author: { name: userProfileRef.current.name, color: userProfileRef.current.color },
                     targetType: 'canvas',
                     createdAt: Date.now()
                 });
                 setActiveCommentIdRef.current(id);
            }
        });

        const sim = d3.forceSimulation<D3Node>().stop(); 
        simulationRef.current = sim;
        
        return () => { sim.stop(); };
    }, [currentProjectId]); // Re-init on room switch to restore room-specific zoom

    useEffect(() => {
        if (!simulationRef.current || !gRef.current) return;
        const sim = simulationRef.current;
        const g = d3.select(gRef.current);
        
        // --- PREPARE DATA ---
        // Ensure nodes/edges are arrays to prevent crash
        const d3Nodes = (nodes || []).map(n => ({...n})) as D3Node[]; 
        const nodeMap = new Map(d3Nodes.map(n => [n.id, n]));
        
        const d3Edges = (edges || []).map(e => {
            // Check if source/target are already objects (from previous d3 pass if reused?) 
            // or strings (from fresh state)
            const sId = typeof e.source === 'object' ? (e.source as NodeData).id : e.source;
            const tId = typeof e.target === 'object' ? (e.target as NodeData).id : e.target;
            
            const s = nodeMap.get(sId);
            const t = nodeMap.get(tId);
            return { ...e, source: s, target: t };
        }).filter(e => e.source && e.target) as D3Edge[];

        sim.nodes(d3Nodes);

        // --- EDGES ---
        const linkGroup = g.selectAll<SVGGElement, D3Edge>(".edge-group").data(d3Edges, (d) => d.id);
        linkGroup.exit().remove();

        // Enter
        const linkEnter = linkGroup.enter().append("g").attr("class", "edge-group");

        // 1. Invisible hit area
        linkEnter.append("path")
            .attr("class", "edge-hit-area")
            .attr("stroke", "transparent")
            .attr("stroke-width", 15)
            .attr("fill", "none")
            .attr("cursor", "pointer")
            .style("pointer-events", "all"); 

        // 2. Visible path
        linkEnter.append("path")
            .attr("class", "edge-visible")
            .attr("fill", "none")
            .style("pointer-events", "none");

        // 3. Arrow Marker
        linkEnter.append("path")
            .attr("class", "edge-arrow")
            .attr("fill", (d) => d.strokeColor || "#9CA3AF")
            .style("pointer-events", "all"); 

        // 4. Label Group
        const labelGroup = linkEnter.append("g")
            .attr("class", "edge-label-group")
            .attr("cursor", "pointer")
            .style("pointer-events", "all")
            .style("opacity", (d) => d.label ? 1 : 0);

        labelGroup.append("rect")
            .attr("class", "label-bg")
            .attr("rx", 4)
            .attr("fill", "white")
            .attr("stroke", "#E5E7EB")
            .style("filter", "drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))");
            
        labelGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("font-size", "10px")
            .attr("font-weight", "500")
            .attr("fill", "#374151")
            .text((d) => d.label || "");

        // Label Buttons Group (Delete + Rotate)
        const btnGroup = labelGroup.append("g")
            .attr("class", "label-controls")
            .style("opacity", 0)
            .attr("cursor", "pointer");

        // Rotate Button
        const rotateBtn = btnGroup.append("g")
            .attr("class", "label-rotate-btn")
            .attr("transform", "translate(0, 0)"); 
        
        rotateBtn.append("circle")
            .attr("r", 6)
            .attr("fill", "#f3f4f6")
            .attr("stroke", "none");
        
        rotateBtn.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em") 
            .attr("font-size", "8px")
            .attr("fill", "#4b5563")
            .text("↻");

        // Delete Button 
        const deleteBtn = btnGroup.append("g")
            .attr("class", "label-delete-btn");

        deleteBtn.append("circle")
            .attr("r", 6)
            .attr("fill", "#ef4444")
            .attr("stroke", "none");

        deleteBtn.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("font-size", "8px")
            .attr("fill", "white")
            .text("×");

        const linkMerge = linkEnter.merge(linkGroup);

        // Visual Updates
        linkMerge.select(".edge-visible")
            .attr("stroke", (d) => d.strokeColor || "#9CA3AF")
            .attr("stroke-width", (d) => d.strokeWidth || 2)
            .attr("stroke-dasharray", (d) => {
                 if(d.strokeType === 'dashed') return "5,5";
                 if(d.strokeType === 'dotted') return "2,2";
                 return "none";
            });

        linkMerge.select(".edge-arrow")
            .attr("d", (d) => {
                if (d.relationType === '1:n') {
                    return `M-8,-5 L0,0 M-8,5 L0,0 M-8,0 L0,0`; 
                } else {
                    return `M-10,-5 L0,0 L-10,5 Z`;
                }
            });

        // Update Labels text
        linkMerge.select(".edge-label-group text").text((d) => d.label || "");
        
        // INTERACTION: Highlight Helpers
        const setHighlight = (edgeId: string, active: boolean) => {
             // const color = active ? "#3b82f6" : ""; // Unused
             const width = active ? 3 : 2;
             
             // Edge
             g.selectAll<SVGPathElement, D3Edge>(".edge-visible")
                .filter((d) => d.id === edgeId)
                .attr("stroke", (d) => active ? "#3b82f6" : (d.strokeColor || "#9CA3AF"))
                .attr("stroke-width", (d) => active ? width : (d.strokeWidth || 2));
                
             g.selectAll<SVGPathElement, D3Edge>(".edge-arrow")
                .filter((d) => d.id === edgeId)
                .attr("fill", (d) => active ? "#3b82f6" : (d.strokeColor || "#9CA3AF"));

             // Label border
             g.selectAll<SVGGElement, D3Edge>(".edge-label-group")
                .filter((d) => d.id === edgeId)
                .select(".label-bg")
                .attr("stroke", active ? "#3b82f6" : "#E5E7EB");
                
             if (active) {
                const d = d3Edges.find(e => e.id === edgeId);
                if(d) {
                    // Highlight source & target nodes
                    g.selectAll<SVGRectElement, D3Node>(".node-box")
                      .filter((n) => n.id === d.source.id || n.id === d.target.id)
                      .attr("stroke", "#3b82f6")
                      .attr("stroke-width", 2);
                }
             } else {
                g.selectAll(".node-box")
                   .attr("stroke", "#E5E7EB")
                   .attr("stroke-width", 1);
             }
        };

        // Arrow Hover -> Label Highlight
        linkMerge.select(".edge-arrow")
            .on("mouseover", (e, d) => {
                 if(isLocked(d)) { triggerShake(d.source.id); triggerShake(d.target.id); return; }
                 setHighlight(d.id, true);
            })
            .on("mouseout", (e, d) => setHighlight(d.id, false));

        // Edge Path Hover -> Label Highlight
        linkMerge.select(".edge-hit-area")
             .on("mouseover", (e, d) => {
                 if(isLocked(d)) return;
                 setHighlight(d.id, true);
             })
             .on("mouseout", (e, d) => setHighlight(d.id, false));

        // Label Interaction Updates
        linkMerge.select(".edge-label-group").each(function(d) {
             const gLabel = d3.select(this);
             const text = gLabel.select("text");
             const bbox = (text.node() as SVGTextElement).getBBox();
             const padding = 6;
             
             const totalWidth = bbox.width + padding*2;
             const totalHeight = 18;
             
             gLabel.select("rect")
                .attr("x", -bbox.width/2 - padding)
                .attr("y", -bbox.height/2 - 2)
                .attr("width", totalWidth) 
                .attr("height", totalHeight);
             
             const btnSpacing = 16;
             const controlsX = bbox.width/2 + padding + 8;
             
             gLabel.select(".label-rotate-btn")
                .attr("transform", `translate(${controlsX}, 0)`)
                .on("click", (e) => {
                     e.stopPropagation();
                     if(isLocked(d)) { triggerShake(d.source.id); triggerShake(d.target.id); return; }
                     const currentRot = d.labelRotation || 0;
                     updateEdgeRef.current({ ...d, source: d.source.id, target: d.target.id, labelRotation: (currentRot + 90) % 360 });
                });

             gLabel.select(".label-delete-btn")
                .attr("transform", `translate(${controlsX + btnSpacing}, 0)`)
                .on("click", (e) => {
                    e.stopPropagation(); // Stop propagation
                    if(isLocked(d)) { triggerShake(d.source.id); triggerShake(d.target.id); return; }
                    updateEdgeRef.current({ ...d, source: d.source.id, target: d.target.id, label: "" });
                });

             // Hover Effect
             gLabel.on("mouseover", function() {
                  if(isLocked(d)) { 
                      // Removed shake on hover to avoid accidental triggering when dragging nearby nodes
                      return;
                  }
                  d3.select(this).select(".label-controls").style("opacity", 1);
                  setHighlight(d.id, true);
             })
             .on("mouseout", function() {
                  d3.select(this).select(".label-controls").style("opacity", 0);
                  setHighlight(d.id, false);
             })
             .on("dblclick", function(e) {
                 e.stopPropagation();
                 if(isLocked(d)) { triggerShake(d.source.id); triggerShake(d.target.id); return; }
                 
                 const group = d3.select(this);
                 const currentText = d.label || "";
                 
                 // Hide visual elements
                 group.selectAll("rect, text, .label-controls").style("display", "none");

                 // Dimensions
                 const width = Math.max(100, bbox.width + 40);
                 const height = 60; // Larger for textarea

                 // Append Foreign Object
                 const fo = group.append("foreignObject")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("x", -width/2)
                    .attr("y", -height/2 - 10); // Center
                 
                 const textarea = fo.append("xhtml:textarea")
                    .style("width", "100%")
                    .style("height", "100%")
                    .style("border", "1px solid #3b82f6")
                    .style("border-radius", "4px")
                    .style("text-align", "center")
                    .style("font-size", "12px")
                    .style("background", "white")
                    .style("resize", "none")
                    .style("outline", "none")
                    .property("value", currentText);
                 
                 const node = textarea.node() as HTMLTextAreaElement;
                 node.focus();
                 node.select();

                 const save = () => {
                     const newVal = node.value;
                     fo.remove();
                     group.selectAll("rect, text, .label-controls").style("display", null);
                     updateEdgeRef.current({ ...d, source: d.source.id, target: d.target.id, label: newVal });
                 };

                 textarea.on("blur", save)
                      .on("keydown", (event: KeyboardEvent) => {
                           if (event.key === "Enter" && !event.shiftKey) {  
                               event.preventDefault(); // Save on Enter
                               save();
                           }
                      })
                      .on("dblclick", (e) => e.stopPropagation());
             });
             
             gLabel.style("opacity", d.label ? 1 : 0);
        });

        // Edge Interactions
        linkMerge.select(".edge-hit-area")
            .attr("cursor", (d) => isLocked(d) ? "not-allowed" : "pointer")
            .on("dblclick", (e, d) => {
                e.stopPropagation();
                if (e.shiftKey) {
                    // Add Comment Anchored to Edge
                     const [x, y] = d3.pointer(e, gRef.current);
                     const id = crypto.randomUUID();
                     addCommentRef.current({
                         id, x, y,
                         content: "New comment",
                         author: { name: userProfileRef.current.name, color: userProfileRef.current.color },
                         targetId: d.id,
                         targetType: 'edge',
                         createdAt: Date.now()
                     });
                     return;
                }
                if (isLocked(d)) { triggerShake(d.source.id); triggerShake(d.target.id); return; }
                setEditingEdgeId(d.id);
            });
        
        // --- TEMP DRAG LINE ---
        const tempLine = g.selectAll(".temp-line").data([0]);
        tempLine.enter().append("path")
            .attr("class", "temp-line")
            .attr("fill", "none")
            .attr("stroke", "#6366F1")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4")
            .style("pointer-events", "none");

        // --- NODES ---
        const nodeGroup = g.selectAll<SVGGElement, D3Node>(".node-group").data(d3Nodes, (d) => d.id);
        nodeGroup.exit().remove();

        const nodeEnter = nodeGroup.enter().append("g")
            .attr("class", "node-group")
            .attr("data-id", (d) => d.id); // For Shake Selector

        // Drag Behavior
        nodeEnter.call(d3.drag<SVGGElement, D3Node>()
                .on("start", (e, d) => { 
                    e.sourceEvent.stopPropagation(); 
                    if (d.locked) {
                        triggerShake(d.id);
                        return;
                    }
                    d.fx = d.x; d.fy = d.y; 
                    sim.alphaTarget(0.1).restart();
                })
                .on("drag", (e, d) => { 
                    if (d.locked) return;
                    d.fx = e.x; d.fy = e.y; 
                })
                .on("end", (e, d) => { 
                    if (d.locked) return;
                    // FIX: sharp jump animation. Keep fx/fy set so D3 doesn't pull it back before React updates.
                    d.fx = e.x; 
                    d.fy = e.y; 
                    
                    sim.alphaTarget(0); 
                    updateNodeRef.current({ ...d, x: e.x, y: e.y }); 
                })
            );

        nodeEnter.on("click", (e, d) => {
            if (d.locked) {
                 triggerShake(d.id);
                 return;
            }
            if (onNodeClick) onNodeClick(nodes.find(n => n.id === d.id)!); 
            e.stopPropagation();
        });

        nodeEnter.on("dblclick", (e, d) => { // Added handler
            e.stopPropagation();
            if (e.shiftKey) {
                 // Add Comment Anchored to Node
                 const h = getNodeHeight(d);
                 addCommentRef.current({
                     id: crypto.randomUUID(),
                     x: d.x, 
                     y: d.y - h/2 - 40,
                     content: "New comment",
                     author: { name: userProfileRef.current.name, color: userProfileRef.current.color },
                     targetId: d.id,
                     targetType: 'node',
                     createdAt: Date.now()
                 });
            }
        });

        // Draw Node
        nodeEnter.append("rect").attr("class", "node-box")
            .attr("width", MIN_BOX_WIDTH).attr("fill", "white").attr("stroke", "#E5E7EB").attr("rx", 6)
            .style("filter", "drop-shadow(0 4px 6px -1px rgb(0 0 0 / 0.1))");
        nodeEnter.append("rect").attr("class", "node-header-bg")
            .attr("width", MIN_BOX_WIDTH).attr("height", CONST_HEADER_HEIGHT).attr("fill", (d) => d.color || "#6366F1").attr("rx", 6);
        nodeEnter.append("text").attr("class", "node-title")
            .attr("x", 10).attr("y", 19).attr("fill", "white").attr("font-weight", "bold").attr("font-size", "12px")
            .style("pointer-events", "none")
            .text((d) => d.title);
        
        // Lock Icon Button (ForeignObject)
        nodeEnter.append("foreignObject")
            .attr("class", "node-lock-btn")
            .attr("x", MIN_BOX_WIDTH - 24)
            .attr("y", 4)
            .attr("width", 20)
            .attr("height", 20)
            .attr("cursor", "pointer");
        
        // We'll hydrate the content of foreignObject in the merge step because d3 data binding doesn't re-render React components well.
        // Actually we can set innerHTML but for Icons we need SVG.
        // We will maintain state in D3 .each

        const nodeMerge = nodeEnter.merge(nodeGroup);
        
        nodeMerge.each(function(d) {
            const el = d3.select(this);
            const h = getNodeHeight(d);
            
            // Set Shake Origin
            el.style("--tx", `${d.x - MIN_BOX_WIDTH/2}px`);
            el.style("--ty", `${d.y - h/2}px`);
            
            el.attr("cursor", d.locked ? "not-allowed" : "grab");
            el.select(".node-box").attr("height", h);
            el.select(".node-header-bg").attr("fill", d.color || "#6366F1");
            el.select(".node-title").text(d.title.length > 22 ? d.title.substring(0,20)+"..." : d.title);
            
            // Render Lock Icon using ReactDOMServer or manual SVG
            // Manual SVG is safer for D3
            // Updated design: Dark Gray Outline for Locked, Gray for Unlocked
            const lockIcon = d.locked 
                ? ReactDOMServer.renderToStaticMarkup(
                    <div style={{
                        display:'flex', 
                        alignItems:'center',
                        justifyContent:'center',
                        width: '100%',
                        height: '100%'
                    }}>
                        <Lock size={14} color="#ffffff" strokeWidth={2} />
                    </div>
                  )
                : ReactDOMServer.renderToStaticMarkup(
                    <div style={{ transform: 'scale(0.9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                         <Unlock size={14} color="#ffffff" />
                    </div>
                  );
            
            el.select(".node-lock-btn").html(`<div style="display:flex;align-items:center;justify-content:center;height:100%;">${lockIcon}</div>`);

            el.select(".node-lock-btn")
                .on("mousedown", (e) => e.stopPropagation()) // Prevent drag start
                .on("click", (e) => {
                     e.stopPropagation();
                     updateNode({ ...d, locked: !d.locked });
                     if (!d.locked) { d.fx = null; d.fy = null; }
                     else { d.fx = d.x; d.fy = d.y; }
                });

            el.selectAll(".node-prop-row").remove();
            
            if (d.props) {
                const rowGroup = el.append("g").attr("class", "node-prop-row");
                
                d.props.forEach((prop, i) => {
                    const y = CONST_HEADER_HEIGHT + (i * PROP_HEIGHT);
                    const pg = rowGroup.append("g").attr("transform", `translate(0, ${y})`);
                    
                    pg.append("text").attr("x", 10).attr("y", 14).attr("font-size", "10px").attr("fill", prop.color || "#374151").text(prop.name);
                    pg.append("text").attr("x", MIN_BOX_WIDTH - 10).attr("y", 14).attr("text-anchor", "end").attr("font-size", "9px").attr("fill", prop.color || "#374151").text(prop.type);
                    
                    if (d.locked) return; 

                    // --- PORT DRAG ---
                    const portDrag = d3.drag<SVGCircleElement, unknown>()
                        .container(function() { return gRef.current!; }) 
                        .on("start", (e) => {
                            e.sourceEvent.stopPropagation();
                            if(d.locked) { triggerShake(d.id); return; }
                            // ... existing logic
                             const isRight = d3.select(e.sourceEvent.target).classed("port-right");
                             const startAbsX = isRight ? d.x + MIN_BOX_WIDTH/2 : d.x - MIN_BOX_WIDTH/2;
                             const startAbsY = (d.y - h/2) + y + 10; 
                            
                            d3.select(gRef.current).datum({ 
                                dragSourceNode: d.id, 
                                dragSourceProp: prop.name,
                                startX: startAbsX, startY: startAbsY 
                            });
                
                            const [mx, my] = d3.pointer(e, gRef.current);
                            d3.select(gRef.current).select(".temp-line")
                                .attr("d", `M ${startAbsX} ${startAbsY} L ${mx} ${my}`)
                                .style("display", "block");
                        })
                        .on("drag", function(e) {
                            if(d.locked) return;
                            const data = d3.select(gRef.current).datum() as { startX: number; startY: number };
                            const [mx, my] = d3.pointer(e, gRef.current);
                            d3.select(gRef.current).select(".temp-line")
                                    .attr("d", `M ${data.startX} ${data.startY} L ${mx} ${my}`);
                        })
                        .on("end", function(e) {
                            if(d.locked) return;
                            d3.select(gRef.current).select(".temp-line").style("display", "none");
                            const data = d3.select(gRef.current).datum() as { dragSourceNode: string; dragSourceProp: string; startX: number; startY: number };
                            if(!data) return;

                            const [mx, my] = d3.pointer(e, gRef.current);
                            const target = d3Nodes.find(n => 
                                !n.locked &&
                                mx > (n.x - MIN_BOX_WIDTH/2) && mx < (n.x + MIN_BOX_WIDTH/2) &&
                                my > (n.y - getNodeHeight(n)/2) && my < (n.y + getNodeHeight(n)/2)
                            );

                            if (target) {
                                const tTop = target.y - getNodeHeight(target)/2;
                                const relY = my - tTop;
                                let targetPropName = undefined;
                                if (relY > CONST_HEADER_HEIGHT && target.props) {
                                    const propIdx = Math.floor((relY - CONST_HEADER_HEIGHT) / PROP_HEIGHT);
                                    if (propIdx >= 0 && propIdx < target.props.length) {
                                        targetPropName = target.props[propIdx].name;
                                    }
                                }
                                let autoLabel = "";
                                if (data.dragSourceProp && targetPropName) {
                                    autoLabel = `${data.dragSourceProp} ➝ ${targetPropName}`;
                                } else if (data.dragSourceProp) {
                                    autoLabel = `${data.dragSourceProp} ➝ (Table)`;
                                }

                                addEdge({
                                    id: crypto.randomUUID(),
                                    source: data.dragSourceNode,
                                    target: target.id,
                                    sourceProp: data.dragSourceProp,
                                    targetProp: targetPropName,
                                    label: autoLabel,
                                    strokeType: 'solid',
                                    strokeWidth: 2,
                                    strokeColor: '#9CA3AF'
                                });
                                showToast("Connected!", "success");
                            }
                            d3.select(gRef.current).datum(null);
                        });

                    pg.append("circle").attr("class", "port-prop port-left").attr("cx", 0).attr("cy", 10).attr("r", 6)
                        .attr("fill", "transparent").attr("stroke", "transparent").attr("cursor", "crosshair")
                        .on("mouseover", function() { d3.select(this).attr("fill", "#F59E0B"); }).on("mouseout", function() { d3.select(this).attr("fill", "transparent"); })
                        .call(portDrag);

                    pg.append("circle").attr("class", "port-prop port-right").attr("cx", MIN_BOX_WIDTH).attr("cy", 10).attr("r", 6)
                        .attr("fill", "transparent").attr("stroke", "transparent").attr("cursor", "crosshair")
                        .on("mouseover", function() { d3.select(this).attr("fill", "#F59E0B"); }).on("mouseout", function() { d3.select(this).attr("fill", "transparent"); })
                        .call(portDrag);
                });
            }
        });

        // --- COMMENTS ---
        const commentGroup = g.selectAll<SVGForeignObjectElement, Comment>(".comment-group")
            .data(comments.filter(c => !c.isResolved), (c) => c.id);
        commentGroup.exit().remove();

        const commentEnter = commentGroup.enter().append("foreignObject")
            .attr("class", "comment-group")
            .attr("width", 200)
            .attr("height", 100) // Dynamic?
            .attr("overflow", "visible");

        const commentMerge = commentEnter.merge(commentGroup);
        commentMerge.raise(); // Ensure always on top

        commentMerge.each(function(c) {
            const el = d3.select(this);
            // Render React Component for Comment
            // We use standard HTML string with some inline styles for simplicity inside D3
            // But complex interactions (reply, resolve) are hard with standard HTML string.
            // Better to use React Portal if possible? Or just re-render fully?
            // Since we are in a React component, we can technically use mapped React elements overlaying the SVG.
            // But foreignObject is inside the SVG transform context (zoom/pan), which is what we want.
            // React overlays require synchronization of transform.
            // Let's stick to simple HTML for display and click handlers.
            
            const isAnchored = !!c.targetId;
            let cx = c.x;
            let cy = c.y;

            if (isAnchored) {
                // Find node
                const targetNode = d3Nodes.find(n => n.id === c.targetId);
                // Find edge? 
                if (targetNode) {
                    cx = targetNode.x!;
                    cy = targetNode.y! - getNodeHeight(targetNode)/2 - 20; // Above node
                }
            }
            
            el.attr("x", cx).attr("y", cy);
            
            // Generate HTML for Comment Bubble
            const html = `
                <div class="comment-bubble" style="
                    background: white; 
                    border-left: 4px solid ${c.author.color};
                    padding: 8px 12px; 
                    border-radius: 0 12px 12px 12px; 
                    font-size: 13px; 
                    max-width: 220px; 
                    box-shadow: 0 4px 15px rgba(0,0,0,0.15); 
                    cursor: pointer;
                    font-family: sans-serif;
                    transition: transform 0.2s;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                ">
                    <div style="font-weight: 700; margin-bottom: 2px; display: flex; justify-content: space-between; align-items: center; color: #374151;">
                        <span style="color:${c.author.color}">${c.author.name}</span>
                        ${c.replies?.length ? `<span style="background:#F3F4F6; color: #6B7280; padding: 2px 6px; border-radius: 99px; font-size: 10px; font-weight: 600;">${c.replies.length}</span>` : ''}
                    </div>
                    <div style="color: #4B5563; line-height: 1.4;">${c.content}</div>
                </div>
            `;
            el.html(html);
            
            el.on("dblclick", (e) => {
                 e.stopPropagation();
                 // Show Reply Modal? Or Inline?
                 // User: "open some chat babble where user could add coment and also it should be check box as resolved"
                 // Ideally trigger a React state to open a "CommentThreadModal" for this comment ID.
                 // We can use a Custom Event or passed callback props.
                 const event = new CustomEvent('openCommentThread', { detail: c.id });
                 window.dispatchEvent(event);
            });
        });


        sim.on("tick", () => {
             linkMerge.select<SVGPathElement>(".edge-hit-area").attr("d", drawCurve);
             linkMerge.select<SVGPathElement>(".edge-visible").attr("d", drawCurve);
             
             linkMerge.select<SVGPathElement>(".edge-arrow")
                 .attr("transform", (d) => {
                     const target = d.target as D3Node;
                     const H_target = getNodeHeight(target);
                     const tLeft = target.x! - MIN_BOX_WIDTH / 2;
                     const tTop = target.y! - H_target / 2;
                     const ty = tTop + getPropYOffset(target, d.targetProp);
                     const isTargetRight = d.target.x! > d.source.x!;
                     const tx = isTargetRight ? tLeft : tLeft + MIN_BOX_WIDTH;
                     const angle = isTargetRight ? 0 : 180;
                     return `translate(${tx}, ${ty}) rotate(${angle})`;
                 })
                 .attr("fill", (d) => d.strokeColor || "#9CA3AF");

             linkMerge.select<SVGGElement>(".edge-label-group").attr("transform", (d) => {
                 const pos = getLabelPos(d);
                 const rot = d.labelRotation || 0;
                 return `translate(${pos.x}, ${pos.y}) rotate(${rot})`;
             });
             
             nodeMerge.attr("transform", (d) => `translate(${d.x! - MIN_BOX_WIDTH/2}, ${d.y! - getNodeHeight(d)/2})`);
             // We also need to update Style transform for Animations (Shake uses CSS transform)
             // But CSS transform conflicts with SVG attr transform on Groups. 
             // We applied Shake via class. 
             // IMPORTANT: CSS transform overrides SVG transform attribute!
             // So 'shaking' class will break the node position if we use 'transform' in CSS.
             // We set --tx, --ty vars on the element and use them in keyframes.
             nodeMerge.style("--tx", (d) => `${d.x! - MIN_BOX_WIDTH/2}px`);
             nodeMerge.style("--ty", (d) => `${d.y! - getNodeHeight(d)/2}px`);
             
             // Update Anchored Comments
             commentMerge.each(function(c) {
                 if (c.targetId) {
                     if (c.targetType === 'node') {
                        const targetNode = d3Nodes.find(n => n.id === c.targetId);
                        if (targetNode) {
                            const cx = targetNode.x!;
                            const cy = targetNode.y! - getNodeHeight(targetNode)/2 - 30; 
                            d3.select(this).attr("x", cx).attr("y", cy);
                        }
                     } else if (c.targetType === 'edge') {
                        const targetEdge = d3Edges.find(e => e.id === c.targetId); // Uses mapped d3Objects
                        if (targetEdge && targetEdge.source && targetEdge.target) {
                            // Find mid point
                            const mx = (targetEdge.source.x! + targetEdge.target.x!) / 2;
                            const my = (targetEdge.source.y! + targetEdge.target.y!) / 2;
                            d3.select(this).attr("x", mx).attr("y", my - 20);
                        }
                     }
                 }
             });
        });
        
        sim.alpha(1).restart();

    }, [nodes, edges, comments, updateNode, updateEdge, addEdge, deleteEdge, showToast, getNodeHeight, drawCurve, getLabelPos, getPropYOffset, onNodeClick, userProfile, isLocked]);

    // Handle Comment Thread Modal via Event (Hack for D3 interaction)
    // Listen to custom event from D3
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            setActiveCommentId(detail);
        };
        window.addEventListener('openCommentThread', handler);
        return () => window.removeEventListener('openCommentThread', handler);
    }, [setActiveCommentId]);

    const handleAddReply = (text: string) => {
        if (!activeCommentId) return;
        const comment = comments.find(c => c.id === activeCommentId);
        if (comment) {
            const newReply = {
                id: crypto.randomUUID(),
                content: text,
                author: { name: userProfile.name, color: userProfile.color },
                createdAt: Date.now()
            };
            updateComment({ ...comment, replies: [...(comment.replies || []), newReply] });
        }
    };

    const handleResolve = () => {
         if (!activeCommentId) return;
         const comment = comments.find(c => c.id === activeCommentId);
         if (comment) {
             updateComment({ ...comment, isResolved: true });
             setActiveCommentId(null);
         }
    };

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (!gRef.current) return;
        const [x, y] = d3.pointer(e.nativeEvent, gRef.current);
        const id = crypto.randomUUID();
        addComment({
            id,
            x, y,
            content: "", 
            author: { name: userProfile.name, color: userProfile.color },
            targetType: 'canvas',
            createdAt: Date.now()
        });
        setActiveCommentId(id);
    }, [userProfile, addComment, setActiveCommentId]);

    return (
        <>
            <div className="absolute top-4 left-20 z-10 flex gap-2"> 
               <button 
                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))} 
                  className="bg-white px-2 py-1 shadow-sm rounded text-xs text-gray-500 hidden"
               >
                 Shift+DblClick to Comment
               </button>
            </div>

            <div className="relative w-full h-full">
                <svg ref={svgRef} className="w-full h-full" style={{ backgroundColor: config.canvasBg || '#f8fafc' }}>
                    <defs></defs>
                    <g ref={gRef} />
                </svg>

                {/* Quick Background Change */}
                <div className="absolute top-4 right-4 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-2 rounded-lg shadow-md border border-gray-200 dark:border-slate-700 flex flex-col gap-2 transition-all hover:opacity-100 opacity-50">
                    <div className="relative group w-6 h-6 flex items-center justify-center rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700" title="Change Background">
                        <Palette size={16} className="text-gray-500 dark:text-gray-400" />
                        <input
                            type="color"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={config.canvasBg || '#f8fafc'}
                            onChange={(e) => updateProjectBackground?.(e.target.value)}
                        />
                    </div>
                </div>

                {isCommentMode && (
                    <div 
                        className="absolute inset-0 z-50"
                        style={{ 
                            cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${encodeURIComponent('#8B5CF6')}" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>') 0 32, auto`
                        }}
                        onClick={handleOverlayClick}
                    />
                )}
            </div>
            
            {editingEdgeId && (
                <EditEdgeModal 
                    key={editingEdgeId}
                    isOpen={!!editingEdgeId} 
                    onClose={() => setEditingEdgeId(null)}
                    edgeId={editingEdgeId}
                />
            )}

            {/* Comment Thread Modal (Simple Absolute Overlay) */}
            {activeCommentId && (() => {
                const comment = comments.find(c => c.id === activeCommentId);
                const isNew = comment?.content === "";

                return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10 backdrop-blur-[1px] dark:bg-black/50" onClick={() => {
                    if (isNew) {
                        deleteComment(activeCommentId);
                    }
                    setActiveCommentId(null);
                }}>
                    <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[600px] flex flex-col overflow-hidden border border-gray-200 dark:bg-indigo-950 dark:border-indigo-800" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 handle cursor-move dark:border-indigo-800 dark:bg-indigo-900/50">
                            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2 dark:text-indigo-200">
                                <MessageSquare size={16} className="text-indigo-500 dark:text-indigo-400"/>
                                {isNew ? "New Comment" : "Thread"}
                            </h3>
                            <button onClick={() => {
                                // If cancelling a new empty comment, delete it
                                if (isNew) {
                                    deleteComment(activeCommentId);
                                }
                                setActiveCommentId(null);
                            }} className="text-gray-400 hover:text-gray-600 dark:text-indigo-400 dark:hover:text-indigo-200"><X size={16}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                             {/* Original Comment */}
                             {(() => {
                                 const c = comments.find(c => c.id === activeCommentId);
                                 if(!c) return null;
                                 
                                 // If it's a new empty draft, don't show the "bubble" yet, just the input
                                 if (c.content === "") {
                                     return (
                                        <div className="text-center text-gray-400 text-xs italic py-4 dark:text-indigo-400">
                                            Start typing to create your comment...
                                        </div>
                                     );
                                 }

                                 return (
                                     <>
                                        <div className="flex gap-2 group/main">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shrink-0" style={{background: c.author.color}}>
                                                {c.author.name[0]}
                                            </div>
                                            <div className="flex-1">
                                                 <div className="text-xs font-bold text-gray-700 flex justify-between dark:text-indigo-200">
                                                    {c.author.name}
                                                    {c.author.name === userProfile.name && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteComment(c.id); setActiveCommentId(null); }}
                                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover/main:opacity-100 transition-opacity dark:text-indigo-400 dark:hover:text-red-400"
                                                            title="Delete thread"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                 </div>
                                                 <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded-lg mt-1 dark:text-indigo-100 dark:bg-indigo-900/50">{c.content}</div>
                                            </div>
                                        </div>
                                        {c.replies?.map(r => (
                                            <div key={r.id} className="flex gap-2 pl-4 group/reply">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shrink-0" style={{background: r.author.color}}>
                                                    {r.author.name[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-gray-700 flex justify-between dark:text-indigo-200">
                                                        {r.author.name}
                                                        {r.author.name === userProfile.name && (
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    const newReplies = c.replies?.filter(rep => rep.id !== r.id);
                                                                    updateComment({...c, replies: newReplies});
                                                                }}
                                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-opacity dark:text-indigo-400 dark:hover:text-red-400"
                                                                title="Delete reply"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded-lg mt-1 dark:text-indigo-100 dark:bg-indigo-900/50">{r.content}</div>
                                                </div>
                                            </div>
                                        ))}
                                     </>
                                 );
                             })()}
                        </div>
                        <div className="p-3 border-t border-gray-100 dark:border-indigo-800">
                             <div className="flex items-center gap-2 mb-2">
                                 <input type="checkbox" id="resolve" className="rounded text-indigo-600" onChange={(e) => { if(e.target.checked) handleResolve(); }} />
                                 <label htmlFor="resolve" className="text-xs text-gray-500 dark:text-indigo-300">Mark as resolved</label>
                             </div>
                             <div className="flex gap-2">
                                 <input 
                                    id="comment-input"
                                    autoFocus
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-100 dark:placeholder-indigo-400/50 dark:focus:border-indigo-500"
                                    placeholder={comments.find(c => c.id === activeCommentId)?.content === "" ? "Type your comment..." : "Write a reply..."}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') {
                                            const val = e.currentTarget.value;
                                            if (!val.trim()) return;
                                            
                                            const c = comments.find(c => c.id === activeCommentId);
                                            if (c && c.content === "") {
                                                updateComment({ ...c, content: val });
                                            } else {
                                                handleAddReply(val);
                                            }
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                 />
                                 <button 
                                    onClick={() => {
                                        const input = document.getElementById('comment-input') as HTMLInputElement;
                                        const val = input.value;
                                        if (!val.trim()) return;
                                        
                                        const c = comments.find(c => c.id === activeCommentId);
                                        if (c && c.content === "") {
                                            updateComment({ ...c, content: val });
                                        } else {
                                            handleAddReply(val);
                                        }
                                        input.value = '';
                                    }}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                                 >
                                    Send
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
                );
            })()}
        </>
    );
};
