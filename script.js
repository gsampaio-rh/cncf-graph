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

function calculateRadialPositions(nodes, center_x, center_y, inner_radius, outer_radius) {
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
            node.fx = center_x + outer_radius * Math.cos(angle);
            node.fy = center_y + outer_radius * Math.sin(angle);
        }
    });
}


d3.json("restructured_data.json").then(function(data) {
    const graph = { nodes: [], links: [] };
    graph.nodes.push(cncfNode);

    data.cncf.forEach((cat) => {
        const categoryNode = { id: cat.category, group: 1 };
        graph.nodes.push(categoryNode);
        graph.links.push({ source: "CNCF", target: cat.category });
    
        cat.subcategories.forEach((subcat) => {
            const subcategoryNode = { id: subcat.subcategory, group: 2, parentCategory: cat.category };
            graph.nodes.push(subcategoryNode);
            graph.links.push({ source: cat.category, target: subcat.subcategory });
        });
    });

    calculateRadialPositions(graph.nodes, w / 2, h / 2, 150, 300);

    var force = d3.forceSimulation()
        .nodes(graph.nodes)
        .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(100))
        .force("charge", d3.forceManyBody().strength(-60).distanceMax(100))
        .force("center", d3.forceCenter(w / 2, h / 2))
        .force("collide", d3.forceCollide().radius(10))
        .on("tick", ticked);

    force.force("link").links(graph.links);

    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link");

    var node = svg.selectAll("circle.node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 7)
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
        .text(function(d) { return d.id; })
        .style("font-size", "8px")
        .style("pointer-events", "none");

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
