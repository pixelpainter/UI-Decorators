import { app } from "../../scripts/app.js";

/* ================== GLOBAL TUNABLE PADDING ==================
   Edit these numbers to adjust vertical spacing.
   - TITLE_PAD_TOP/BOTTOM: padding above/below title text (px)
   - DIVIDER_PAD_TOP/BOTTOM: padding above/below divider line (px)
   - NOTE_PAD_TOP/BOTTOM: space above/below the NOTE box (px)
   - NOTE_INNER_PAD_X:    left/right padding inside NOTE box (px)
   - NOTE_INNER_PAD_TOP:  top padding inside NOTE box (px)
   - NOTE_INNER_PAD_BOTTOM: bottom padding inside NOTE box (px)
   - NOTE_LINE_HEIGHT_MULT: line spacing multiplier (e.g. 1.2–1.6)
============================================================ */
const TITLE_PAD_TOP = 3;
const TITLE_PAD_BOTTOM = 1;
const DIVIDER_PAD_TOP = 3;
const DIVIDER_PAD_BOTTOM = 1;
const NOTE_PAD_TOP = 3;
const NOTE_PAD_BOTTOM = 4;
const NOTE_INNER_PAD_X = 5;
const NOTE_INNER_PAD_TOP = 4;
const NOTE_INNER_PAD_BOTTOM = 5;
const NOTE_LINE_HEIGHT_MULT = 1.4;


/* ---------------- utils ---------------- */
function propKey(name) { return `__ui_${name}`; }

function getProp(node, k, fallback) {
    node.properties = node.properties || {};
    return Object.prototype.hasOwnProperty.call(node.properties, k)
        ? node.properties[k]
        : fallback;
}

function setProp(node, k, v) {
    node.properties = node.properties || {};
    node.properties[k] = v;
}

function parseHex(v, fallback = "#ffffff") {
    if (!v) return fallback;
    let s = String(v).trim();
    if (!s.startsWith("#")) s = "#" + s;
    if (s.length === 4) {
        s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    }
    if (s.length !== 7) return fallback;
    return s.toLowerCase();
}

function isInnerDecoratorNode(n) {
    return n?.comfyClass === "TitleNode" || n?.comfyClass === "DividerNode" || n?.comfyClass === "SpacerNode" || n?.comfyClass === "NoteNode";
}

/* ---------------- graph traversal helper ---------------- */
function getInnerGraph(outerNode) {
    return outerNode.subgraph ?? 
           outerNode.subGraph ?? 
           outerNode._subgraph ?? 
           outerNode.innerGraph ??
           (typeof outerNode.getInnerGraph === "function" ? outerNode.getInnerGraph() : null) ??
           (typeof outerNode.getSubgraph === "function" ? outerNode.getSubgraph() : null);
}

/* ---------------- drawing helpers ---------------- */
function drawDividerLine(ctx, width, y, color, pad) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, y + pad);
    ctx.lineTo(width - 8, y + pad);
    ctx.stroke();
    ctx.restore();
}

// Text wrapping helper for Canvas
function getWrappedLines(ctx, text, maxWidth) {
    if (!text) return [];
    const rawLines = text.split('\n');
    let finalLines = [];
    
    for (const line of rawLines) {
        if (!line) {
            finalLines.push("");
            continue;
        }
        
        if (ctx.measureText(line).width <= maxWidth) {
            finalLines.push(line);
        } else {
             // Basic word wrap
            const words = line.split(' ');
            let currentLine = words[0];
            
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = ctx.measureText(currentLine + " " + word).width;
                if (width < maxWidth) {
                    currentLine += " " + word;
                } else {
                    finalLines.push(currentLine);
                    currentLine = word;
                }
            }
            finalLines.push(currentLine);
        }
    }
    return finalLines;
}

/* ---------------- UI_SUB_TITLE widget ---------------- */
function makeUITitleFactory() {
    return (node, inputName, inputData, _app) => {
        const def = (Array.isArray(inputData) && inputData[1]?.default)
            ? inputData[1].default
            : "Section Title";

        const kText = propKey(`${inputName}_text`);
        const initial = getProp(node, kText, def);

        const w = node.addWidget(
            "text",
            inputName,
            initial,
            (v) => {
                const val = (v ?? "").toString();
                w.value = val;
                setProp(node, kText, val);
                node.setDirtyCanvas(true, true);
                if (app.canvas) app.canvas.setDirty(true, true);
            },
            { serialize: true, multiline: false, placeholder: def }
        );

        w.isDecoratorTitle = true;
        w.serialize = true;
        w.serializeValue = () => getProp(node, kText, def);

        w.draw = function(ctx, n, widgetWidth, y) {
            const isInner = isInnerDecoratorNode(n);
            const txt = (this.value ?? "").toString();

            let fontSize = 14;
            let bold = false;
            let color = "#ffffff";

            if (isInner) {
                fontSize = Number(getProp(n, propKey("title_font_size"), 14));
                bold = !!getProp(n, propKey("title_bold"), false);
                color = parseHex(getProp(n, propKey("title_color"), "#ffffff"));
            } else {
                const g = getInnerGraph(n);
                if (g) {
                    const innerNodes = g._nodes ?? g.nodes ?? [];
                    
                    const idMatch = this.name && this.name.match(/^(\d+):/);
                    let matchedNode = null;
                    if (idMatch) {
                        const nodeId = parseInt(idMatch[1]);
                        matchedNode = innerNodes.find(n => n.id === nodeId);
                    }
                    
                    if (!matchedNode) {
                        matchedNode = innerNodes.find(inNode => 
                            inNode.comfyClass === "TitleNode" && 
                            getProp(inNode, propKey("title_text"), def) === txt
                        );
                    }

                    if (!matchedNode) {
                        const validTitles = innerNodes
                            .filter(inNode => inNode.comfyClass === "TitleNode")
                            .sort((a, b) => (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0));
                        const outerTitles = n.widgets.filter(wd => wd.isDecoratorTitle);
                        const myIndex = outerTitles.indexOf(this);
                        if (myIndex >= 0 && myIndex < validTitles.length) {
                            matchedNode = validTitles[myIndex];
                        }
                    }

                    if (matchedNode) {
                        fontSize = Number(getProp(matchedNode, propKey("title_font_size"), 14));
                        bold = !!getProp(matchedNode, propKey("title_bold"), false);
                        color = parseHex(getProp(matchedNode, propKey("title_color"), "#ffffff"));
                    }
                }
            }

            const textY = y + TITLE_PAD_TOP;

            ctx.save();
            ctx.font = `${bold ? 700 : 400} ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = color;
            ctx.textBaseline = "top";
            ctx.fillText(txt, 12, textY);
            ctx.restore();
        };

        w.computeSize = function(widgetWidth) {
            const isInner = isInnerDecoratorNode(node);
            let fontSize = 14;
            
            if (isInner) {
                fontSize = Number(getProp(node, propKey("title_font_size"), 14));
            } else {
                const txt = (this.value ?? "").toString();
                const g = getInnerGraph(node);
                if (g) {
                    const innerNodes = g._nodes ?? g.nodes ?? [];
                    const idMatch = this.name && this.name.match(/^(\d+):/);
                    let matchedNode = null;
                    if (idMatch) {
                        const nodeId = parseInt(idMatch[1]);
                        matchedNode = innerNodes.find(n => n.id === nodeId);
                    }
                    if (!matchedNode) {
                        matchedNode = innerNodes.find(inNode => 
                            inNode.comfyClass === "TitleNode" && 
                            getProp(inNode, propKey("title_text"), "") === txt
                        );
                    }
                    if (!matchedNode) {
                        const validTitles = innerNodes
                            .filter(inNode => inNode.comfyClass === "TitleNode")
                            .sort((a, b) => (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0));
                        const outerTitles = node.widgets.filter(wd => wd.isDecoratorTitle);
                        const myIndex = outerTitles.indexOf(this);
                        if (myIndex >= 0 && myIndex < validTitles.length) {
                            matchedNode = validTitles[myIndex];
                        }
                    }
                    if (matchedNode) {
                        fontSize = Number(getProp(matchedNode, propKey("title_font_size"), 14));
                    }
                }
            }

            const h = TITLE_PAD_TOP + TITLE_PAD_BOTTOM + (fontSize + 4);
            return [200, h];
        };

        return { widget: w };
    };
}

/* ---------------- UI_SUB_DIVIDER widget ---------------- */
function makeUIDividerFactory() {
    return (node, inputName, _inputData, _app) => {
        // Title-attached divider (`divider_in`) is hidden (no draw, no height)
        // Standalone DividerNode remains unaffected.
        const _isTitleAttached = (inputName === "divider_in");

        const w = node.addCustomWidget({
            type: _isTitleAttached ? "ui_divider_title_hidden" : "ui_divider",
            name: inputName,
            serialize: false,

            draw: function(ctx, n, widgetWidth, y) {
                if (_isTitleAttached) return;

		        const isInner = isInnerDecoratorNode(n);
		        const pad = DIVIDER_PAD_TOP;
		        let color = "#666666";

		        // IMPORTANT: Divider color must NEVER come from a TitleNode.
		        // When the widget is shown on the Subgraph front node (linked OR promoted),
		        // we must match it ONLY to inner DividerNode instances. Otherwise, the
		        // divider will "steal" title_color (red) via index/fallback matching.
		        if (isInner) {
		            color = parseHex(getProp(n, propKey("divider_color"), "#666666"));
		        } else {
		            const g = getInnerGraph(n);
		            if (g) {
		                const innerNodes = g._nodes ?? g.nodes ?? [];
		                const validDividers = innerNodes
		                    .filter(inNode => inNode.comfyClass === "DividerNode")
		                    .sort((a, b) => (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0));

		                let matchedNode = null;

		                // Promotion usually prefixes the widget name with "<innerId>:..."
		                const idMatch = this.name.match(/^(\d+):/);
		                if (idMatch) {
		                    const nodeId = parseInt(idMatch[1]);
		                    matchedNode = validDividers.find(nn => nn.id === nodeId) || null;
		                }

		                // Linking often does NOT include the inner node id in the widget name,
		                // so fall back to stable vertical-order index matching among divider widgets.
		                if (!matchedNode) {
		                    const outerDividers = n.widgets.filter(wd => wd.type === "ui_divider");
		                    const myOuterIndex = outerDividers.indexOf(this);
		                    if (myOuterIndex >= 0 && myOuterIndex < validDividers.length) {
		                        matchedNode = validDividers[myOuterIndex];
		                    }
		                }

		                if (matchedNode) {
		                    color = parseHex(getProp(matchedNode, propKey("divider_color"), "#666666"));
		                }
		            }
		        }

                drawDividerLine(ctx, widgetWidth, y, color, pad);
            },

            computeSize: function(widgetWidth) {
                if (_isTitleAttached) return [200, 0];
                const pad = DIVIDER_PAD_TOP;
return [200, DIVIDER_PAD_TOP + 1 + DIVIDER_PAD_BOTTOM];
            },
        });

        w.serialize = true;
        w.serializeValue = () => null;

        return { widget: w };
    };
}

/* ---------------- UI_SPACER widget ---------------- */
function makeUISpacerFactory() {
    return (node, inputName, _inputData, _app) => {
        const w = node.addCustomWidget({
            type: "ui_spacer",
            name: inputName,
            serialize: false,

            draw: function(ctx, n, widgetWidth, y) {
                const isInner = isInnerDecoratorNode(n);
                if (isInner) {
                    ctx.save();
                    ctx.strokeStyle = "#444";
                    ctx.setLineDash([2, 4]);
                    ctx.beginPath();
                    const h = this.computedHeight || 20;
                    ctx.moveTo(4, y);
                    ctx.lineTo(8, y);
                    ctx.moveTo(4, y);
                    ctx.lineTo(4, y + h);
                    ctx.lineTo(8, y + h);
                    ctx.stroke();
                    ctx.restore();
                }
            },

            computeSize: function(widgetWidth) {
                const isInner = isInnerDecoratorNode(node);
                let height = 20;
                if (isInner) {
                    height = Number(getProp(node, propKey("spacer_height"), 20));
                } else {
                    const g = getInnerGraph(node);
                    if (g) {
                        const innerNodes = g._nodes ?? g.nodes ?? [];
                        const validSpacers = innerNodes
                            .filter(inNode => inNode.comfyClass === "SpacerNode")
                            .sort((a, b) => (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0));
                        
                        let matchedNode = null;
                        const idMatch = this.name.match(/^(\d+):/);
                        if (idMatch) {
                             const nodeId = parseInt(idMatch[1]);
                             matchedNode = validSpacers.find(n => n.id === nodeId);
                        } else {
                            const myOuterIndex = node.widgets.filter(wd => wd.type === "ui_spacer").indexOf(this);
                            if (myOuterIndex >= 0 && myOuterIndex < validSpacers.length) {
                                matchedNode = validSpacers[myOuterIndex];
                            }
                        }
                        if (matchedNode) {
                             height = Number(getProp(matchedNode, propKey("spacer_height"), 20));
                        }
                    }
                }
                this.computedHeight = height;
                return [200, height];
            },
        });
        w.serialize = true;
        w.serializeValue = () => null;
        return { widget: w };
    };
}

/* ---------------- UI_NOTE widget ---------------- */

function makeUINoteFactory() {
    return (node, inputName, inputData, _app) => {
        const def = (Array.isArray(inputData) && inputData[1]?.default)
            ? inputData[1].default
            : "Note text here...";

        const kText = propKey(`${inputName}_text`);
        const initial = getProp(node, kText, def);

        // Use a STANDARD text widget so it handles editing correctly
        const w = node.addWidget(
            "text",
            inputName,
            initial,
            (v) => {
                const val = (v ?? "").toString();
                w.value = val;
                setProp(node, kText, val);
                node.setDirtyCanvas(true, true);
                if (app.canvas) app.canvas.setDirty(true, true);
            },
            { serialize: true, multiline: true, placeholder: def }
        );

        w.serialize = true;
        w.serializeValue = () => getProp(node, kText, def);

        w._measuredHeight = 60;

        w.draw = function(ctx, n, widgetWidth, y) {
            // Unified drawing for BOTH Inner and Outer
            const isInner = isInnerDecoratorNode(n);
            let txt = (this.value ?? "").toString();
            let color = "#aaaaaa";
            let bgColor = "#222222";
            let fontSize = 12;
            let bold = false;

            if (isInner) {
                // Inner Node: Read own props
                color = parseHex(getProp(n, propKey("note_color"), "#aaaaaa"));
                bgColor = parseHex(getProp(n, propKey("note_bg_color"), "#222222"));
                fontSize = Number(getProp(n, propKey("note_font_size"), 12));
                bold = !!getProp(n, propKey("note_bold"), false);
            } else {
                // Outer Node: Find inner node and read props
                const g = getInnerGraph(n);
                if (g) {
                    const innerNodes = g._nodes ?? g.nodes ?? [];
                    const validNotes = innerNodes
                        .filter(inNode => inNode.comfyClass === "NoteNode")
                        .sort((a, b) => (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0));
                    
                    let matchedNode = null;
                    const idMatch = this.name.match(/^(\d+):/);
                    if (idMatch) {
                         const nodeId = parseInt(idMatch[1]);
                         matchedNode = validNotes.find(n => n.id === nodeId);
                    } else {
                        const outerNotes = n.widgets.filter(wd => wd.type === "text" && wd.name.includes("note")); 
                        const myOuterIndex = outerNotes.indexOf(this);
                        if (myOuterIndex >= 0 && myOuterIndex < validNotes.length) {
                            matchedNode = validNotes[myOuterIndex];
                        }
                    }
                    
                    if (matchedNode) {
                        txt = getProp(matchedNode, propKey("note_text"), "Enter note text...");
                        color = parseHex(getProp(matchedNode, propKey("note_color"), "#aaaaaa"));
                        bgColor = parseHex(getProp(matchedNode, propKey("note_bg_color"), "#222222"));
                        fontSize = Number(getProp(matchedNode, propKey("note_font_size"), 12));
                        bold = !!getProp(matchedNode, propKey("note_bold"), false);
                    }
                }
            }

            if (!txt) txt = " ";

            const padX = NOTE_INNER_PAD_X;
            const padTop = NOTE_INNER_PAD_TOP;
            const padBottom = NOTE_INNER_PAD_BOTTOM;
            const margin = 10; 
            const topPadding = NOTE_PAD_TOP;
            const drawY = y + topPadding;

            ctx.save();
            ctx.font = `${bold ? "bold" : "normal"} ${fontSize}px Inter, system-ui, sans-serif`;
            
            const textWidthAvailable = widgetWidth - (margin * 2) - (padX * 2);
            const lines = getWrappedLines(ctx, txt, textWidthAvailable);
            const lineHeight = fontSize * NOTE_LINE_HEIGHT_MULT;
            const leading = Math.max(0, lineHeight - fontSize);
            const lineOffsetY = leading * 0.5; // center extra leading
            const rectHeight = (lines.length * lineHeight) + padTop + padBottom;

            // --- FEEDBACK LOOP & RESIZE LOGIC ---
            // Reduced buffer from 30 to 10 to tighten spacing
            const totalNeededHeight = rectHeight + NOTE_PAD_TOP + NOTE_PAD_BOTTOM; 
            
            if (Math.abs((w._measuredHeight || 0) - totalNeededHeight) > 2) {
                w._measuredHeight = totalNeededHeight;
                requestAnimationFrame(() => {
                     const sz = n.computeSize();
                     // Preserve current width to avoid snapping/locking behavior
                     sz[0] = n.size[0];
                     n.setSize(sz);
                     n.setDirtyCanvas(true, true);
                });
            }

            // Draw Background
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(margin, drawY, widgetWidth - (margin * 2), rectHeight, 4);
            } else {
                ctx.rect(margin, drawY, widgetWidth - (margin * 2), rectHeight);
            }
            ctx.fill();

            // Draw Text
            ctx.fillStyle = color;
            ctx.textBaseline = "top";
            
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], margin + padX, drawY + padTop + lineOffsetY + (i * lineHeight));
            }
            
            ctx.restore();
        };

        w.computeSize = function(widgetWidth) {
            // UNLOCK WIDTH: Return the passed widgetWidth (or node width)
            // instead of hardcoded 200. This allows the node to widen.
            let width = widgetWidth;
            if ((!width || width < 50) && node.size && node.size[0]) {
                width = node.size[0];
            }
            if (!width) width = 200;

            if (w._measuredHeight && w._measuredHeight > 0) {
                return [width, w._measuredHeight];
            }
            return [width, 60]; 
        };

        return { widget: w };
    };
}

/* ---------------- color math helpers ---------------- */
function hexToRgb(hex) {
    hex = parseHex(hex, "#ffffff");
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 255, g: 255, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r, g, b) {
    const toHex = (x) => {
        const clamped = Math.max(0, Math.min(255, Math.round(x)));
        const s = clamped.toString(16);
        return s.length === 1 ? "0" + s : s;
    };
    return "#" + toHex(r) + toHex(g) + toHex(b);
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) h = ((b - r) / d + 2);
        else h = ((r - g) / d + 4);
        h /= 6;
    }
    return { h: h * 360, s, v };
}

function hsvToRgb(h, s, v) {
    h = (h % 360 + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

function addSimpleColorControls(node, propName, defaultHex, labelOverride) {
    const kColor = propKey(propName);
    const initialHex = parseHex(getProp(node, kColor, defaultHex), defaultHex);
    const widgetName = labelOverride || propName.split('_').pop(); 
    const hexWidget = node.addWidget("text", widgetName, initialHex, (v) => {
        const parsed = parseHex(v, null);
        if (!parsed) return;
        setProp(node, kColor, parsed);
        node.setDirtyCanvas(true, true);
        if (app.canvas) app.canvas.setDirty(true, true);
    }, { serialize: false, multiline: false, placeholder: "#ffffff" });

    function openColorPopup() {
        const currentHex = parseHex(getProp(node, kColor, defaultHex), defaultHex);
        const { r, g, b } = hexToRgb(currentHex);
        let { h, s, v } = rgbToHsv(r, g, b);
        
        const overlay = document.createElement("div");
        Object.assign(overlay.style, { position: "fixed", left: "0", top: "0", width: "100vw", height: "100vh", zIndex: "999999", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" });
        const panel = document.createElement("div");
        Object.assign(panel.style, { background: "#222", border: "1px solid #555", borderRadius: "6px", padding: "8px", minWidth: "220px", color: "#ddd", display: "flex", flexDirection: "column", gap: "6px" });
        
        const canvas = document.createElement("canvas");
        canvas.width = 180; canvas.height = 120;
        Object.assign(canvas.style, { width: "180px", height: "120px", background: "#000", cursor: "crosshair" });
        const ctx = canvas.getContext("2d");
        
        function redraw() {
            ctx.clearRect(0, 0, 180, 120);
            const { r: rh, g: gh, b: bh } = hsvToRgb(h, 1, 1);
            const gradX = ctx.createLinearGradient(0, 0, 156, 0);
            gradX.addColorStop(0, "#ffffff");
            gradX.addColorStop(1, `rgb(${rh},${gh},${bh})`);
            ctx.fillStyle = gradX;
            ctx.fillRect(0, 0, 156, 120);
            const gradY = ctx.createLinearGradient(0, 0, 0, 120);
            gradY.addColorStop(0, "rgba(0,0,0,0)");
            gradY.addColorStop(1, "rgba(0,0,0,1)");
            ctx.fillStyle = gradY;
            ctx.fillRect(0, 0, 156, 120);
            const cx = s * 156;
            const cy = (1 - v) * 120;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "black";
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.stroke();
            for(let i=0; i<120; i++) {
                const col = hsvToRgb(i/120*360, 1, 1);
                ctx.fillStyle = `rgb(${col.r},${col.g},${col.b})`;
                ctx.fillRect(162, i, 18, 1);
            }
            const hy = (h / 360) * 120;
            ctx.strokeStyle = "white";
            ctx.strokeRect(161, hy-2, 20, 4);
        }
        
        let draggingSV = false;
        let draggingHue = false;

        function handleCanvasDown(ev) {
            const rect = canvas.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const y = ev.clientY - rect.top;
            if (x > 160) {
                draggingHue = true;
                h = Math.max(0, Math.min(1, y / 120)) * 360;
            } else {
                draggingSV = true;
                s = Math.max(0, Math.min(1, x / 156));
                v = 1 - Math.max(0, Math.min(1, y / 120));
            }
            update();
            redraw();
        }
        
        function handleCanvasMove(ev) {
            if (!draggingSV && !draggingHue) return;
            const rect = canvas.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const y = ev.clientY - rect.top;
            if (draggingHue) {
                h = Math.max(0, Math.min(1, y / 120)) * 360;
            } else if (draggingSV) {
                s = Math.max(0, Math.min(1, x / 156));
                v = 1 - Math.max(0, Math.min(1, y / 120));
            }
            update();
            redraw();
        }

        function handleCanvasUp() { draggingSV = false; draggingHue = false; }
        
        function update() {
             const rgb = hsvToRgb(h, s, v);
             const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
             hexWidget.value = hex;
             if (hexWidget.callback) {
                hexWidget.callback(hex);
             }
        }

        canvas.onmousedown = handleCanvasDown;
        window.onmousemove = handleCanvasMove;
        window.onmouseup = handleCanvasUp;
        
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close";
        closeBtn.onclick = () => { 
            document.body.removeChild(overlay); 
            window.onmousemove = null; 
            window.onmouseup = null; 
        };
        
        panel.appendChild(canvas);
        panel.appendChild(closeBtn);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        redraw();
    }
    node.addWidget("button", "pick", "pick", () => openColorPopup(), { serialize: false });
    setProp(node, kColor, initialHex);
}


/* ---------------- add node-face controls ---------------- */
function mirrorLinkState(innerNode, inputName) {
    const inp = (innerNode.inputs || []).find(i => i?.name === inputName);
    const linked = !!(inp && inp.link != null);
    setProp(innerNode, propKey(`linked_${inputName}`), linked);
}

function addTitleControls(node) {
    const sizeKey = propKey("title_font_size");
    const initSize = Number(getProp(node, sizeKey, 14));
    node.addWidget(
        "number",
        "font_size",
        initSize,
        (v) => {
            const nv = Math.max(8, Math.min(64, Math.round(Number(v) || 14)));
            setProp(node, sizeKey, nv);
            node.setDirtyCanvas(true, true);
        },
        { serialize: false, precision: 0 }
    );

    const boldKey = propKey("title_bold");
    const initBold = !!getProp(node, boldKey, false);
    node.addWidget(
        "toggle",
        "bold",
        initBold,
        (v) => {
            setProp(node, boldKey, !!v);
            node.setDirtyCanvas(true, true);
        },
        { serialize: false }
    );

    addSimpleColorControls(node, "title_color", "#ffffff", "color");

    const prevOnConfigure = node.onConfigure;
    node.onConfigure = function (o) {
        mirrorLinkState(node, "title");
        mirrorLinkState(node, "divider_in");
        if (prevOnConfigure) prevOnConfigure.call(this, o);
    };

    const prevOnFG = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        mirrorLinkState(node, "title");
        mirrorLinkState(node, "divider_in");
        if (prevOnFG) prevOnFG.call(this, ctx);
    };
}

function addDividerControls(node) {
    addSimpleColorControls(node, "divider_color", "#ffffff", "color");

    const prevOnConfigure = node.onConfigure;
    node.onConfigure = function (o) {
        mirrorLinkState(node, "divider");
        if (prevOnConfigure) prevOnConfigure.call(this, o);
    };

    const prevOnFG = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        mirrorLinkState(node, "divider");
        if (prevOnFG) prevOnFG.call(this, ctx);
    };
}

function addSpacerControls(node) {
    const sizeKey = propKey("spacer_height");
    const initSize = Number(getProp(node, sizeKey, 20));

    // Numerical widget on the subgraph canvas (the node face)
    node.addWidget(
        "number",
        "height_px",
        initSize,
        (v) => {
            const nv = Math.max(0, Math.min(1000, Math.round(Number(v) || 0)));
            setProp(node, sizeKey, nv);
            node.setDirtyCanvas(true, true);
            if (app.canvas) app.canvas.setDirty(true, true);
        },
        { serialize: false, precision: 0, min: 0, max: 1000, step: 10 }
    );

    const prevOnConfigure = node.onConfigure;
    node.onConfigure = function (o) {
        mirrorLinkState(node, "spacer");
        if (prevOnConfigure) prevOnConfigure.call(this, o);
    };

    const prevOnFG = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        mirrorLinkState(node, "spacer");
        if (prevOnFG) prevOnFG.call(this, ctx);
    };
}

function addNoteControls(node) {
    // Font Size
    const sizeKey = propKey("note_font_size");
    const initSize = Number(getProp(node, sizeKey, 12));
    node.addWidget("number", "font_size", initSize, (v) => {
        setProp(node, sizeKey, v); node.setDirtyCanvas(true, true);
    }, { serialize: false, precision: 0 });

    // Bold
    const boldKey = propKey("note_bold");
    const initBold = !!getProp(node, boldKey, false);
    node.addWidget("toggle", "bold", initBold, (v) => {
        setProp(node, boldKey, !!v); node.setDirtyCanvas(true, true);
    }, { serialize: false });

    // Colors
    addSimpleColorControls(node, "note_color", "#aaaaaa", "text_color");
    addSimpleColorControls(node, "note_bg_color", "#222222", "bg_color");

    // Remove the manual text widget addition
    // The factory handles the main widget.
    
    const prevOnConfigure = node.onConfigure;
    node.onConfigure = function (o) {
        mirrorLinkState(node, "note");
        if (prevOnConfigure) prevOnConfigure.call(this, o);
    };

    const prevOnFG = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
        mirrorLinkState(node, "note");
        if (prevOnFG) prevOnFG.call(this, ctx);
    };
}

/* ---------------- register ---------------- */
app.registerExtension({
    name: "Comfy.ui.decorator.widgets",
    async getCustomWidgets() {
        return {
            "UI_SUB_TITLE": makeUITitleFactory(),
            "UI_SUB_DIVIDER": makeUIDividerFactory(),
            "UI_SPACER": makeUISpacerFactory(),
            "UI_NOTE": makeUINoteFactory(),
        };
    },
});

app.registerExtension({
    name: "Comfy.ui.decorators",
    async nodeCreated(node) {
        if (node.comfyClass === "TitleNode") addTitleControls(node);
        if (node.comfyClass === "DividerNode") addDividerControls(node);
        if (node.comfyClass === "SpacerNode") addSpacerControls(node);
        if (node.comfyClass === "NoteNode") addNoteControls(node);
    }
});