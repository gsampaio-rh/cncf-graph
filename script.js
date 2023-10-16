var cncfNode = {"id": "CNCF", "group": 0};

// SVG frame creation
var w = window.innerWidth,
    h = window.innerHeight;

var svg = d3.select("#network")
    .attr("width", w)
    .attr("height", h);

// Zoom behavior
// var zoom = d3.zoom()
//     .scaleExtent([0.1, 10])
//     .on("zoom", (event) => {
//         svg.attr("transform", event.transform);
//     });

// svg.call(zoom);

// Define color groups based on the group attribute
var color = d3.scaleOrdinal()
    .domain([0, 1, 2, 3])
    .range(["#ffa500", "#3b5998", "#1976d2", "#388e3c"]);

// Tooltip setup
var div = d3.select("div.tooltip");

// Load the data from the JSON file
d3.json("interactive-landscape.json").then(function(graph) {

    // Add the CNCF node to the nodes list
    graph.nodes.unshift(cncfNode);

    // Add links between CNCF and all category nodes
    graph.nodes.forEach(function(node) {
        if (node.group === 1) {  // Assuming group 1 represents categories
            graph.links.push({"source": "CNCF", "target": node.id});
        }
    });


    // Force layout setup
    var force = d3.forceSimulation()
        .nodes(graph.nodes)
        .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(50))
        .force("charge", d3.forceManyBody().strength(-1)) // Increase repulsion strength for a tighter cluster
        .force("center", d3.forceCenter(w / 2, h / 2))
        .force("collide", d3.forceCollide().radius(10)) // Prevents nodes from overlapping
        .on("tick", ticked);

    force.force("link")
        .links(graph.links);

    // Draw links
    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link");

    // Draw nodes
    var node = svg.selectAll("circle.node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 8)
        .attr("fill", function(d) { return color(d.group); })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.on("click", nodeClicked)
        .on("dblclick", nodeDoubleClicked)
        .on("mouseover", nodeMouseover)
        .on("mouseout", nodeMouseout);

    // Draw node labels
    var labels = svg.selectAll(".label")
    .data(graph.nodes)
    .enter().append("text")
    .attr("class", "label")
    .text(function(d) { return d.id; })
    .style("font-size", "10px")
    .style("pointer-events", "none"); // Ensure the labels do not interfere with node dragging

    // Functions for the force layout
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

    // Functions for node interactions
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

    // Explode graph on double-click anywhere
    svg.on("dblclick", function() {
        graph.nodes.forEach(function(o, i) {
            o.x += (Math.random() - .5) * 200;
            o.y += (Math.random() - .5) * 200;
        });
        force.alpha(1).restart();
    });

});
