/*
 * Copyright (c) 2013, Steven Rybicki
 * All rights reserved.

 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 

 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 

 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// For an example of how to use this, see git_visi.html

/* Create a new git tree visulation in the desired location
 * w: width of the svg to put the graph in
 * h: height of the svg to put the graph in
 * div_id: which div to put the svg in
 */
function GitTree(w, h, div_id, id){
    var width = w,
        height = h,
        level_height = 100,
        border_offset = 25;
    var svg = d3.select(div_id).append("svg")
        .attr("id",id)
        .attr("width", width)
        .attr("height", height);
    svg.append("rect")
        .attr("class", "rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill","#82CAFF");

    var force = d3.layout.force()
        .gravity(.05)
        .distance(70)
        .charge(-50)
        .size([width, height]);

    var color_alloc = d3.scale.category10();

    var hash_to_node = {};
    var global_heads = [];

    /* A tree like structure out of nodes
     * nodes: an array of nodes of the form {hash:...}
     * return: a dictionary with the elements:
     *         root: the root hash
     *         hash_to_child: dictionary that connects parents to children.
     */
    function makeTree(nodes){
        hash_to_child = {};
        root = "";
        nodes.forEach(function(n){
            if(n.type != "head"){
            if(n.parent_hash[0] == "") root = n.hash;
            else n.parent_hash.forEach(function(e) {
                if(!(e in hash_to_child)) hash_to_child[e] = [];
                hash_to_child[e].push(n.hash)});
            }
        });
        return {"root":root, "hash_to_child":hash_to_child};
    }



    /* Recursively generate a dictionary which links all hashes to their depth in the tree of
     * commits. 
     * 
     * hash: the hash currently examined. 
     * hash_to_child: a dictionary of the form given by makeTree
     * count: the current depth of the tree
     * counts: the dictionary containing counts
     *
     * returns: the counts object updated with all the depths of items with hashes
     * further down the tree than the given hash
     */
    function getDepths(hash,hash_to_child,count,counts){
        if(!(hash in counts && counts[hash] > count))
            counts[hash] = count
        if(hash in hash_to_child)
            hash_to_child[hash].forEach(function(h){
                getDepths(h,hash_to_child,count+1,counts)
            });
        return counts;
    }

    /**
     * Recursively traverse the tree from the current hash to the heighest ancestor, giving all
     * the nodes traversed on the way. 
     *
     * hash: the node hash to start at
     * hash_to_node: a tree like structure produced by makeTree
     * ancestor_list: the list of ancestors traversed so far
     * returns: array of nodes that are ancestors of the given node
     */
    function getAncestorNodes(hash,hash_to_node,ancestor_list){
        var node = hash_to_node[hash]
        if(!(node in ancestor_list)){
            ancestor_list.push(node)
            if(!(node.parent_hash[0] == "")) 
                node.parent_hash.forEach(function(h){getAncestorNodes(h,hash_to_node,ancestor_list)});
        }
        return ancestor_list;
    }
    /**
     * Given the data of a git repo and a list of heads, construct a d3
     * friendly representation of links and nodes.
     *
     * dataArray: An array of the repo data
     * heads: an array representing the heads. This needs to an array with each
     * entry of the form [head_name,hash_pointed_at]
     * returns: dictionary of the form {nodes: ... , links:....}
     */
    function createNodes(dataArray,heads){
        var nodes = []
            links = []

        // Populate the nodes array with data from the git repo
        dataArray.forEach(function(e){
            node = {"hash":e[0],"parent_hash":e[1].split(" "),"author_name":e[2],"subject":e[3],"time":e[4],"type":"commit","fillColor":"orange"}
            if(node.parent_hash == ""){ 
                node.fixed = true
                node.x = width/2
            }
            nodes.push(node);
            hash_to_node[e[0]] = node
        });
        
        // Create the links for those nodes
        dataArray.forEach(function(e){
            if (e[1] != "") {
                e[1].split(" ").forEach(
                    function(p){
                        links.push({"target":hash_to_node[p],"source":hash_to_node[e[0]],"type":"link"})
                    }
                )
            }
        });

        // Create data for heads
        heads.forEach(function(n){

            var node = {"hash":n[0],"commit_node":n[1],"type":"head","fillColor": color_alloc(getColorHash(n[0]))};
            nodes.push(node);
            hash_to_node[n[0]] = node;
            links.push({"source":node,"target":hash_to_node[n[1]]});
        });
        return {"nodes":nodes,"links":links,"hash_to_node":hash_to_node} 

    }

    /* Given a head hash, get the hash used for coloring purposes */
    function getColorHash(hash){
            var star_index = hash.lastIndexOf("*");
            return star_index > -1? hash.slice(0,star_index):hash; // must have same color regardless of whether its the checked out branch or not
    }

    function processNodes(nodes, heads, links, hash_to_node){
        // Add the heads
        var tree = makeTree(nodes);
        var depths = getDepths(tree.root, tree.hash_to_child, 0, {});
        var head_depths = {};
        nodes.forEach(function(m){ // clear previous set depths
            m.headDepth = null;
        });
        heads.forEach(function(n){
            // color the nodes and give heads depth
            var ancestors = getAncestorNodes(n[1],hash_to_node,[]);
            ancestors.forEach(function(m){
                if (m["headDepth"] == null || m["headDepth"] > depths[n[1]]){
                    m.fillColor = color_alloc(getColorHash(n[0]));
                    m.headDepth = depths[n[1]];
                }
            });
            // get the depth of the head
            var d = depths[n[1]];
            while(d in head_depths) d++;
            head_depths[d] = 1;
            depths[n[0]] = d;
        });

        // Give each node its y position
        nodes.forEach(function(n){n.level_y = level_height * depths[n.hash] + border_offset; });
        // Give each node its x position
        give_x_coords(tree.root, tree.hash_to_child, hash_to_node, 0, width);
        return {"nodes":nodes,"links":links}
    }

    /**
     * Recursively travel through the tree and assign each x co-ordinate a series of bounds in order to allocate its position.
     *
     * - Node are allocated according to a system of bounds: the root of the tree
     * is given an allocation of [0,width].
     * - From then, every node allocates its
     * children an equal share of its bound, e.g. if n1 has children n2, n3 then n1
     * and bounds [0,100] then n2 will have bounds [0,50] and n3 will have bounds
     * [50,100].
     *  - If a node has more than one parent, it gets the combination of the
     * interval, for example if we take n2 and n3 from above, their child n4 will
     * have bounds [0,100]
     */
    function give_x_coords(hash, hash_to_child, hash_to_node, lower_bound, upper_bound){
        var parent_node = hash_to_node[hash];

        if (parent_node.bounds ==null){
            parent_node.bounds = [lower_bound,upper_bound];
        }
        else{
            var bounds = parent_node.bounds;
            parent_node.bounds = [Math.min(lower_bound,bounds[0]), Math.max(bounds[1],upper_bound)];
        }
        if(hash in hash_to_child){
            var l = hash_to_child[hash].length;
            for(var i=0;i<l;i++){
                var child_hash = hash_to_child[hash][i];
                lower = lower_bound+i*((upper_bound-lower_bound)/l);
                upper = lower_bound+(i+1)*((upper_bound-lower_bound)/l);
                give_x_coords(child_hash, hash_to_child, hash_to_node,lower ,upper );
            }
        }
    }
    
    /**
     * Given some nodes and links in the format expected by d3, render the graph.
     *
     * Works by calling draw and initilising force.
     */
    function render_graph(nodes,links){
        force.nodes(nodes)
             .links(links)
             .start();

        draw()
        draw()
        // Make sure links are under nodes
        var svg = d3.select("#"+id)[0][0]; // select the actual svg object
        var children = svg.childNodes; // get all elements it contains
        var nodes = []; // all nodes in the svg
        for(var i=0;i<children.length;i++){
            var child = svg.childNodes[i];
            if(!(child.__data__ == undefined)){
                if(child.__data__.type == "commit" || child.__data__.type == "head"){
                    nodes.push(child);
                }   
            }
        }
        nodes.forEach(function(n){ // remove each node and then re-add it so they're all rendered above the links
            svg.removeChild(n);
            svg.appendChild(n);
        });
        tick();
        force.stop();
    }

    /**
     * A function called often and almost entirely magic.
     *
     * Updates the current graph shown.
     */
    function draw(){
        var link = svg.selectAll("path.link")
            .data(force.links());

        var linkEnter = link.enter()
            .append("svg:g")
            .attr("class","links");

        var linkPath = linkEnter
            .append("svg:path")
            .attr("class", "link")
            .attr("marker-end",function(d){return "url(#marker"+d.target.hash+")";})

        var linkMarker = linkEnter
          .append("svg:marker")
          .attr("id",function(d){ return "marker"+d.target.hash} )
          .attr("viewBox","0 0 20 20")
          .attr("refX","30")
          .attr("refY","10")
          .attr("markerUnits","strokeWidth")
          .attr("markerWidth","11")
          .attr("markerHeight","7")
          .attr("orient","auto")
        var linkMarkerPath = linkMarker
          .append("svg:path")
          .attr("d","M 0 0 L 20 10 L 0 20 z");

        var node = svg.selectAll(".node").data(force.nodes(), function(d){return d.hash});
              node.enter().append("g")
              .attr("class", "node")
              .call(force.drag);

        node.append("svg:path")
            .attr("d", d3.svg.symbol()
            .size(function(d) { return 2750; })
            .type(function(d) { return d.type=="commit"?"circle":"square"; }))
            .attr("stroke","white")
            .attr("stroke-width","3")
            .attr("id",function(d){return d["hash"]})
            .attr("fill",function(d){return d.fillColor });

        node.append("foreignObject")
            .attr("x",-21)
            .attr("y",-8)
            .attr("width", 125)
            .attr("height", 125)
            .append("xhtml:body")
            .style("font", "14px 'Helvetica Neue'")
            .html(function(d) {return d["hash"].slice(0,8)});
        svg.order();
        node.exit().remove();
        link.exit().remove();
    }

    /* Given a node d, calculate where it should be based on its type and its
     * bounds */
    function boundsToX(d){
        return d.type=="commit"?(d.bounds[0]+d.bounds[1])/2:border_offset;
    }

    /* Update a node's position
     *
     * This is basically useless as each node is assigned statically but left
     * in case we want to refactor it at some point!
     *
     * A node's y coordinate is given by it's level_y value, it's x value is
     * given according to boundsToX
     */
    function tick() {
        var adj = -3;
        var link = svg.selectAll("path.link")
            node = svg.selectAll(".node");
    // Movement of links
        link.attr("d", function(d) {
                return "M" + boundsToX(d.source) + "," + (d.source.level_y+adj) + "A" + 0 + "," + 0 + " 0 0,1 " + boundsToX(d.target) + "," + (d.target.level_y+adj);
        });
        link.attr("opacity",0);
          node.transition().attr("transform", function(d) { 
              return "translate(" +boundsToX(d) + "," + d.level_y + ")"; 
          })
                           .duration(600);
        link.transition().attr("opacity",1)
                         .duration(300)
                         .delay(600);
    };

    /* Make a graph from git visualisation data
     * TODO: flesh this out a bit
     */
    this.makeGraph = function makeGraph(node_data,heads){
        var h = []
        for(var i=0;i<heads.length;i++){
            h.push([heads[i][0],heads[i][1]]);
        }
        if(force.nodes()[0] == undefined) { // no nodes already defined
            var data = createNodes(node_data,h);
            var refined_data = processNodes(data.nodes,h,data.links,hash_to_node);
            render_graph(data.nodes,data.links);
            global_heads = h;
        }
        else{
           // There's already a graph drawn, so we need to update it with the
           // data given
           var new_nodes = [],
               remaining_nodes = [],
               new_heads = [],
               remaining_heads = [],
               n_hashes = {},
               h_hashes= {};
           // Add new nodes and heads
           node_data.forEach(function(n){
                var hash = n[0];
                if(!(hash in hash_to_node)||hash_to_node[hash]==undefined)
                    new_nodes.push(n);
                n_hashes[hash] = n;
           });
           h.forEach(function(n){
                var hash = n[0];
                if(!(hash in hash_to_node)||hash_to_node[hash]==undefined)
                    new_heads.push(n);
                else{
                    var nd = hash_to_node[hash]
                    if(nd.commit_node != n[1])
                        new_heads.push(n);
                }
                h_hashes[hash] = n;
           });
           // Remove old nodes and links, preserve nodes that are staying
           force.nodes().forEach(function(n){
                var hash = n.hash;
                var keep_head = false
                if(hash in h_hashes){
                    h.forEach(function(h){
                        if(h[0] == hash && h[1] == n.commit_node)
                            keep_head = true;
                    });
                }
                if(hash in n_hashes || keep_head){
                   remaining_nodes.push(n);  
                }
                else{
                    hash_to_node[hash] = undefined;
                    force.links(force.links().filter(function(itm){
                        return !(itm.source.hash==hash || itm.target.hash==hash)
                    }));
                }
           });

           // Process and render new graph
           var data = createNodes(new_nodes, new_heads);
           var ns = remaining_nodes.concat(data.nodes);
           var ls = force.links().concat(data.links);
           var hs = [];
           for(var i=0;i<h.length;i++)
               hs.push(h[i]);
           var refined_data = processNodes(ns,hs,ls,hash_to_node);
           render_graph(ns,ls);
           global_heads = hs;
        }
    }
}
