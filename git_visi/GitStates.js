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

/*
 * A visualisation representing the following explanantion of the states files
 * in git have:
 *
 *-When you start a repository, all files are untracked.
 *-We then stage some files...
 *-and then we commit. Now some files are tracked and unmodified while
 * some are untracked. 
 *-We then work a bit on the project, modifying some of the files
 *-We then decide to stage all the modified files along with some of
 * the unmodified files.
 *-And then commit them all
 *
 * w: the width of the block to make
 * h: the height of the block to make
 * vis_id: in which div must we put the visualisation
 * con_id: in which div must we put the git console commands
 */
// TODO: choose better colors
function GitStates(w,h,vis_id,con_id){
    var width = w,
        height = h;

    /* Background rectangles */
    var svg = d3.select(vis_id).append("svg")
        .attr("id","git_states")
        .attr("width", width)
        .attr("height", height);
    var rect = svg.append("rect")
        .attr("class", "rect")
        .attr("width", width)
        .attr("height", height)
        .attr("stroke","black")
        .attr("stroke-width",3)
        .attr("fill","#82CAFF");
    var stagedGroup = svg.append("g");
    var staged = stagedGroup.append("rect")
        .attr("class","state_elem")
        .attr("width",width-40)
        .attr("height",100)
        .attr("x",20)
        .attr("y",20)
        .attr("stroke","white")
        .attr("stroke-width","3")
        .attr("fill","green");
    var stagedText = stagedGroup.append("text")
        .attr("class","state_elem")
        .attr("x",30)
        .attr("y",50)
        .text("Staged")
        .attr('fill', 'white');
    var trackedGroup = svg.append("g");
    var tracked = trackedGroup.append("rect")
        .attr("class","state_elem")
        .attr("width",width-40)
        .attr("height",100)
        .attr("x",20)
        .attr("y",160)
        .attr("stroke","white")
        .attr("stroke-width","3")
        .attr("fill","blue");
    var trackedText = trackedGroup.append("text")
        .attr("class","state_elem")
        .attr("x",30)
        .attr("y",185)
        .text("Tracked")
        .attr('fill', 'white');
    var unTrackedText = svg.append("text")
        .attr("class","state_elem")
        .attr("x",30)
        .attr("y",290)
        .text("Untracked")
        .attr('fill', 'white');
    // Make all the elements that mustn't be displayed at the start invisible
    // at the start
   var state_elems = d3.selectAll(".state_elem").attr("opacity",0); 
    /* Files */
    /* Given a file object, give where it should be placed horizontally
     *
     * This is calculated based on a file's index
     */
    function getFileX(d){
         return 75+d.index*80 + (d.index-1)*10
    }
    /* Given a file object, give where it should be placed vertically
     *
     * This is calcated based on a file's state
     */
    function getFileY(d){
         pos = 0;
         if(d.state == "s" || d.state == "sm") pos = 30;
         else if(d.state == "u" || d.state=="n") pos = 295;
         else pos = 170;
         return pos
    }
    // States that represent the desired case
    var file_states = [["n","n","n","n","n"],["u","u","u","u","u"],["s","s","s","u","u"],["t","t","t","u","u"],["m","m","t","u","u"],["sm","sm","t","s","u"],["t","t","t","t","u"]];

    // Generate file names
    var fileNames = [];
    for(var i=1;i<6;i++){
        fileNames.push({"index":i,"name":"file_"+i,"state":file_states[0][i-1]});
    }

    /* Create a set of rectangles that represent the files that will be in a
     * variety of states in this demonstration
     */
    function refreshFiles(){
        var files = d3.select("#git_states").selectAll(".files")
            .data(fileNames)
            .enter()
            .append("g")
            .attr("class","files");
        files.append("rect")
             .attr("class","files_rect")
             .attr("width",80)
             .attr("height",80)
             .attr("stroke","black")
             .attr("stroke-width", 3)
             .attr("x",function(d){return getFileX(d)})
             .attr("fill",function(d){return (d.state=="m"||d.state=="sm")?"red":"orange"})
             .attr("id",function(d){return d.name});
        files.append("text")
            .attr("class","files_text")
            .attr("x",function(d){return getFileX(d)+5})
            .text(function(d){return d.name});
       d3.selectAll(".files_rect").transition().attr("y",function(d){return getFileY(d)});
       d3.selectAll(".files_text").transition().attr("y",function(d){return getFileY(d) + 30});
    }

    /* Helper function to refresh the colours of files */
    function refreshFileColours(){
        d3.selectAll(".files_rect")
          .attr("fill",function(d){return (d.state=="m"||d.state=="sm")?"red":"orange"})
    }

    /* Consoles */
    var con = d3.select(con_id);
    this.state = 0;
    var TOTAL_STATES = 7;
    console_states = ["",
        "$ git init\n$ git status\n# Untracked files:\n#   file_1\n#   file_2\n#   file_3\n#   file_4\n#   file_5",
        "$ git add file_1;git add file_2; git add file_3; git status;\n"+            "# Changes to be committed:\n"+
            "#   new file:   file_1\n"+
            "#   new file:   file_2\n"+
            "#   new file:   file_3\n"+
            "#\n"+
            "# Untracked files:\n"+
            "#   file_4\n"+
            "#   file_5",
        "$ git commit -m 'Initial commit'\n[master (root-commit) 379fbcb] Initial commit\n"+
            "0 files changed\n"+
            "create mode 100644 file_1\n"+
            "create mode 100644 file_2\n"+
            "create mode 100644 file_3\n"+
            "$ git status\n# Untracked files:\n"+
            "#   file_4\n"+
            "#   file_5",
        "$ emacs file_1\n$ emacs file_2\n$ git status\n# Changes not staged for commit:\n"+
            "#   modified:   file_1\n"+
            "#   modified:   file_2\n"+
            "#\n"+
            "# Untracked files:\n"+
            "#   file_4\n"+
            "#   file_5",
        "$ git add file_1\n$ git add file_2\n$ git add file_4\n$ git status\n# Changes to be committed:\n"+
            "#   modified:   file_1\n"+
            "#   modified:   file_2\n"+
            "#   new file:   file_4"+
            "#\n"+
            "# Untracked files:\n"+
            "#   file_5\n",
        "$ git commit -m 'corrected some bugs in file_1 and file_2'\n[master 75ee497] corrected some bugs in file_1 and file_2\n"+
             "2 files changed, 2 insertions(+)\n"+
             "create mode 100644 file_4\n"+
             "$ git status\n# Untracked files:\n"+
             "#   file_5"];
    /* Given a state 0 (before starting the situation) and state 6 (the last
     * state in the situation), represent that state in the elements whose
     * indices were provided on construction.
     *
     * Returns true if that state was able to be transitioned into, returns
     * false if the state given is invalid.
     */
    this.setState = function set_state(state){
       if(state >= 0 && state < TOTAL_STATES){
           con.html(console_states[state]);
           var state_elems = d3.selectAll(".state_elem");
           if(state == 0) // files not committed yet
               state_elems.transition().style("opacity",0);
           else
               state_elems.transition().style("opacity",1);
           fileNames.forEach(function(n){
               n.state = file_states[state][n.index-1]
           });
           refreshFiles();
           refreshFiles();
           refreshFileColours();
           return true;
       }
       return false;
    };
    this.setState(0); // start simulation at the first point
}
