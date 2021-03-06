const CrowdSimApp = require("./sim/CrowdSimApp.js")
const Agent = require("./sim/Agent.js")
const fs = require("fs");
const path = require("path");
const util = require("util");
const stream = require("stream");




class NodeApp extends CrowdSimApp {
  constructor(objString, agentStartsString, ticks) {
    super();
    this.objFilename = objString;
    this.agentStartsFilename = agentStartsString;
    this.ticks = ticks;

    //this.go();

  }
  async go() {
    let obj = fs.readFileSync(path.join(__dirname, "../objs/" + this.objFilename), "utf-8");
    //Boot simulation tells Recast to load the scene

    this.bootMesh(obj);

    //Path is the path to the file where we will store our results
    let result = fs.readFileSync(path.join(process.cwd(), "examples/agentStarts/" + this.agentStartsFilename), "utf-8");

    let stream = result.split('\n');
    Agent.index = 0;
    stream.forEach(l => l.trim().length > 0 ? CrowdSimApp.agents.push(new Agent(l)) : 0 == 0);

    let currentMillisecond = 0; //The current time
    let millisecondsBetweenFrames = 40; //40ms between frames, or 25fps
    let secondsOfSimulation = this.ticks; //How long should the simulation run? Change this to whatever you want.
    for (let i = 0; i < secondsOfSimulation; i++) {
      if (i < 1) {
        // initialize all agent's id
        for (let id = 0; id < CrowdSimApp.agents.length; id++) {
          let agent = CrowdSimApp.agents[id];
          agent.setId(id);
        }
      }

      for (let j = 0; j < CrowdSimApp.agents.length; j++) {
        let agent = CrowdSimApp.agents[j]; //Grab each agent in the list

        //Ignore agents that have come into the simulation and exited
        if (agent.hasEntered && !agent.inSimulation) continue;

        //See if we need to add the agent to the simulation
        if (!agent.hasEntered && agent.startMSec <= currentMillisecond) {
          let start = agent.getStart();//Get the agent's starting point as a  array
          let idx = this.crowd.addAgent(start, this.getAgentParams(CrowdSimApp.updateFlags)); //Assign that poPoly to the agent
          agent.idx = idx;

          //Now find the nearest valid location to the agent's desired destination
          //and assign that nearest point.
          let nearest = this.query.findNearestPoly(agent.getEnd(), this.ext, this.filter);
          this.crowd.requestMoveTarget(agent.idx, nearest.getNearestRef(), nearest.getNearestPos());
          agent.hasEntered = true;
          agent.inSimulation = true;
        }
        if (agent.hasEntered) {

          agent.setActive(true);
          agent.setActive(false);
          let agentCurPos = [this.crowd.getAgent(j).npos[0], this.crowd.getAgent(j).npos[1], this.crowd.getAgent(j).npos[2]];
          let agentDes = agent.getEnd();

          let _x = agentCurPos.x - agent.destX;
          let _z = agentCurPos.z - agent.destZ;

          let distanceToDestination = Math.sqrt(_x * _x + _z * _z);
          if(distanceToDestination < 2){
            this.crowd.removeAgent(agent.idx);
          }
          if (this.comparePos(agentCurPos, agentDes)) {
            agent.inSimulation = false;
          }

        }
      }
      this.crowd.update(1 / 25.0, null, i);

      //Update the current simulation time
      this.writeAgentPosition(currentMillisecond, this.objFilename, this.agentStartsFilename, this.ticks);
      currentMillisecond += millisecondsBetweenFrames;
    }
    await this.finish();
  }
  async finish() {
    //= require( https://nodesource.com/blog/understanding-streams-in-nodejs/
    const finished = util.promisify(stream.finished); // (A)

    this.outStream.end();
    await finished(this.outStream);
    console.log("Ended outStream")
  }
  truncate(num) {
    if (num > 0)
      return Math.floor(num)
    else
      return Math.ceil(num);
  }
  comparePos(pos1, pos2) {
    let res = false;

    let endX1 = pos1[0];
    let endY1 = pos1[2];

    let endX2 = pos2[0];
    let endY2 = pos2[2];

    let absEndX = Math.abs(this.truncate(endX1 - endX2));
    let absEndY = Math.abs(this.truncate(endY1 - endY2));

    if (absEndX <= 2 && absEndY <= 2) {
      res = true;
    }
    return res;
  }
}

module.exports = NodeApp;