var cncfNode = {"id": "CNCF", "group": 0};

// SVG frame creation
var w = window.innerWidth,
    h = window.innerHeight;

var svg = d3.select("#network")
    .attr("width", w)
    .attr("height", h);

var extendedPalette = [].concat(
    d3.schemeCategory10,
    d3.schemeSet1,
    d3.schemeSet2,
    d3.schemeSet3,
    d3.schemePastel1,
    d3.schemePastel2,
    d3.schemeTableau10
);

var color = d3.scaleOrdinal(extendedPalette);

var div = d3.select("div.tooltip");

function calculateRadialPositions(nodes, center_x, center_y, inner_radius, middle_radius, outer_radius) {
    const categories = nodes.filter(node => node.group === 1);
    const angleStepCategory = 2 * Math.PI / categories.length;

    const categoryAngles = {};
    categories.forEach((category, index) => {
        categoryAngles[category.id] = index * angleStepCategory;
    });

    nodes.forEach(node => {
        if (node.group === 0) {
            node.fx = center_x;
            node.fy = center_y;
        } else if (node.group === 1) {
            const angle = categoryAngles[node.id];
            node.fx = center_x + inner_radius * Math.cos(angle);
            node.fy = center_y + inner_radius * Math.sin(angle);
        } else if (node.group === 2) {
            const parentAngle = categoryAngles[node.parentCategory];
            const subcategories = nodes.filter(n => n.parentCategory === node.parentCategory && n.group === 2);
            const angleStepSubcategory = angleStepCategory / (subcategories.length + 1);
            const subcategoryIndex = subcategories.findIndex(n => n.id === node.id);
            const angle = parentAngle + (subcategoryIndex + 1) * angleStepSubcategory - angleStepCategory / 2;
            node.fx = center_x + middle_radius * Math.cos(angle);
            node.fy = center_y + middle_radius * Math.sin(angle);
        } else if (node.group === 3) {
            const parentSubcat = nodes.find(n => n.id === node.parentSubcategory && n.group === 2);
            if(!parentSubcat) return;
            const parentAngle = Math.atan2(parentSubcat.fy - center_y, parentSubcat.fx - center_x);
            
            const tools = nodes.filter(n => n.parentSubcategory === node.parentSubcategory && n.group === 3);
            const adjacentSubcategories = nodes.filter(n => n.parentCategory === parentSubcat.parentCategory && n.group === 2);
            const angularDistance = 2 * Math.PI / adjacentSubcategories.length;
            const maxToolAngle = angularDistance / (tools.length + 1); // +1 to leave some space between tools
            
            const toolIndex = tools.findIndex(n => n.id === node.id);
            const toolAngleOffset = (toolIndex + 1) * maxToolAngle - angularDistance / 2; // Center the tools around the parent
            
            node.fx = center_x + (outer_radius + 50) * Math.cos(parentAngle + toolAngleOffset);
            node.fy = center_y + (outer_radius + 50) * Math.sin(parentAngle + toolAngleOffset);
        }
    });
}

d3.json("restructured_data.json").then(function(data) {
    const graph = { nodes: [], links: [] };
    graph.nodes.push(cncfNode);

    data.cncf.forEach((cat) => {
        let catID = cat.category;
        if (cat.category === "Orchestration & Management") {
            catID += " Cat";
        }
        const categoryNode = { id: catID, group: 1 };
        graph.nodes.push(categoryNode);
        graph.links.push({ source: "CNCF", target: catID });
    
        cat.subcategories.forEach((subcat) => {
            const subcategoryNode = { id: subcat.subcategory, group: 2, parentCategory: catID };
            graph.nodes.push(subcategoryNode);
            graph.links.push({ source: catID, target: subcat.subcategory });

            // Add tools/components as nodes and create links to their respective subcategories
            // Set the maximum number of tools you want to display for each subcategory
            const maxToolsPerSubcategory = 80;  // You can adjust this value

            subcat.tools.forEach((tool, index) => {
                if(index < maxToolsPerSubcategory) {
                    const toolNode = { id: tool.Name, group: 3, parentSubcategory: subcat.subcategory };
                    graph.nodes.push(toolNode);
                    graph.links.push({ source: subcat.subcategory, target: tool.Name });
                }
            });
        });
    });

    function resetNodePositions(nodes) {
        nodes.forEach(node => {
            node.fx = null;
            node.fy = null;
        });
    }

    document.getElementById('positionToggle').addEventListener('change', function() {
        if (this.checked) {
            calculateRadialPositions(graph.nodes, w / 2, h / 2, 60, 120, 500);
        } else {
            resetNodePositions(graph.nodes);
        }
        force.alpha(1).restart(); // This will cause the force layout to re-evaluate and update the visualization.
    });
    // calculateRadialPositions(graph.nodes, w / 2, h / 2, 60, 120, 500);

    var force = d3.forceSimulation()
        .nodes(graph.nodes)
        .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(300))
        .force("charge", d3.forceManyBody().strength(-5).distanceMax(450))
        .force("center", d3.forceCenter(w / 2, h / 2))
        .force("collide", d3.forceCollide().radius(15))
        .on("tick", ticked);

    force.force("link").links(graph.links);

    document.getElementById('distanceSlider').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('distanceValue').textContent = value;
        force.force("link").distance(+value);
        force.alpha(1).restart();
    });
    
    document.getElementById('strengthSlider').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('strengthValue').textContent = value;
        force.force("charge").strength(+value);
        force.alpha(1).restart();
    });
    
    document.getElementById('collideSlider').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('collideValue').textContent = value;
        force.force("collide").radius(+value);
        force.alpha(1).restart();
    });

    document.getElementById('resetButton').addEventListener('click', function() {
        // Reset Sliders to Default Values
        document.getElementById('distanceSlider').value = 300;
        document.getElementById('distanceValue').textContent = 300;
    
        document.getElementById('strengthSlider').value = -3;
        document.getElementById('strengthValue').textContent = -3;
    
        document.getElementById('collideSlider').value = 10;
        document.getElementById('collideValue').textContent = 10;
    
        // Reset Checkboxes to Default Values
        document.getElementById('labelToggle').checked = true;
        d3.selectAll(".label").style("display", "block");  // Ensure labels are visible
    
        // document.getElementById('positionToggle').checked = true;
        // Re-enable radial positions (if you have logic tied to this checkbox)
    
        // Reset the force simulation values
        force.force("link").distance(300);
        force.force("charge").strength(-5);
        force.force("collide").radius(15);
        force.alpha(1).restart();
    });
    

    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link");

    var node = svg.selectAll("circle.node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d) {
            switch(d.group) {
                case 0: return 10;   // CNCF node size
                case 1: return 7;    // Category node size
                case 2: return 5;    // Subcategory node size
                case 3: return 3;    // Tool node size
                default: return 3;
            }
        })
        .attr("fill", function(d) { return color(d.group); })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.on("click", nodeClicked)
        .on("dblclick", nodeDoubleClicked)
        .on("mouseover", nodeMouseover)
        .on("mouseout", nodeMouseout);

    var labels = svg.selectAll(".label")
        .data(graph.nodes)
        .enter().append("text")
        .attr("class", "label")
        .text(function(d) { 
            return d.id.replace(' Cat', ''); 
        })
        .style("font-size", "5px")
        .style("pointer-events", "none")
        .style("display", document.getElementById('labelToggle').checked ? "block" : "none");

    // Add the event listener for the checkbox here
    document.getElementById('labelToggle').addEventListener('change', function() {
        if (this.checked) {
            d3.selectAll(".label").style("display", "block");
        } else {
            d3.selectAll(".label").style("display", "none");
        }
    });

    function ticked() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        labels.attr("x", function(d) { return d.x; })
              .attr("y", function(d) { return d.y; });
    }

    function dragstarted(event, d) {
        if (!event.active) force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) force.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function nodeClicked(d, i) {
        d3.select(this).style("fill", d3.select(this).style("fill") === "orange" ? color(d.group) : "orange");
    }

    function nodeDoubleClicked(d, i) {
        d.fixed = !d.fixed;
    }

    function nodeMouseover(d, i) {
        div.style("visibility", "visible")
            .transition()
            .duration(200)
            .style("opacity", .9);
        div.html("ID: " + d.id + "<br/>Group: " + d.group)
            .style("left", (d.x + 15) + "px")
            .style("top", (d.y - 30) + "px");
    }

    function nodeMouseout(d, i) {
        div.transition()
            .duration(500)
            .style("opacity", 0)
            .on("end", function() {
                div.style("visibility", "hidden");
            });
    }

    svg.on("dblclick", function() {
        graph.nodes.forEach(function(o, i) {
            o.x += (Math.random() - .5) * 200;
            o.y += (Math.random() - .5) * 200;
        });
        force.alpha(1).restart();
    });
});
