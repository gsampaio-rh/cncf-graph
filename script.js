var cncfNode = {"id": "CNCF", "group": 0};

// Set up the SVG canvas dimensions
var width = window.innerWidth,
    height = window.innerHeight;

var svg = d3.select("#network")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

// Define the zoom behavior
var zoom = d3.zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", (event) => {
        container.attr("transform", event.transform);
    });

svg.call(zoom);

// Container to hold nodes and links (for zoom and pan)
var container = svg.append("g");

// Load the data (assuming the name of the file is interactive-landscape.json)
d3.json("interactive-landscape.json").then(function(graph) {

    // Add the CNCF node to the nodes list
    graph.nodes.push(cncfNode);

    // Add links between CNCF and all category nodes
    graph.nodes.forEach(function(node) {
        if (node.group === 1) {  // Assuming group 1 represents categories
            graph.links.push({"source": "CNCF", "target": node.id});
        }
    });
    
    // Create a force simulation
    var simulation = d3.forceSimulation()
        .nodes(graph.nodes)
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(0, 0));

    // Draw links
    var link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line");

    // Define color groups based on the group attribute
    var color = d3.scaleOrdinal()
        .domain([0, 1, 2, 3])
        .range(["#ff9800", "#d32f2f", "#1976d2", "#388e3c"]);

        // Draw nodes
    var node = container.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .attr("fill", function(d) { return color(d.group); })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    

    // Add node labels
    var labels = container.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(graph.nodes)
        .enter().append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function(d) { return d.id; });

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        labels
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; });
    }
});

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
