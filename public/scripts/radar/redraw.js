let lastMousePos = {
  x: canvasSize / 2,
  y: canvasSize / 2,
};

function redrawRadarScreen() {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  /**
   * Island outline first because they cover large surfaces
   */
  let islandOutline = getIslandOutline(radarAirport);
  if (islandOutline) {
    for (let i = 0; i < islandOutline.length; i++) {
      Island.draw(islandOutline[i], false);
    }
  }

  /**
   * Water bodies second because they cover large surfaces
   * but ON terrain
   */
  let waterBodies = getWaterbodies(radarAirport);
  if (waterBodies) {
    for (let i = 0; i < waterBodies.length; i++) {
      Water.draw(waterBodies[i], true);
    }
  }
  // draw debug and radar circle
  // DebugLines.draw();
  RadarCircle.draw(lastMousePos);
  Square.draw(
    circleCenterAndRadius - 2.5 * resolutionScale,
    circleCenterAndRadius - 2.5 * resolutionScale,
    2 * resolutionScale,
    2 * resolutionScale
  );

  // draw at mouse and PAY ATTENTION TO ORDER
  // first line, then circle
  // Line.draw(canvasSize / 2, canvasSize / 2, lastMousePos.x, lastMousePos.y);
  // GeneralCircle.draw(lastMousePos.x, lastMousePos.y);

  // Draw aerodrome specific objects

  // Runways
  let runways = getRunways(radarAirport);
  if (runways) {
    for (let i = 0; i < runways.length; i++) {
      const rwy = runways[i];
      let middle = new Vec(rwy.middle.x * resolutionScale, rwy.middle.y * resolutionScale);
      Runway.draw(middle, runwayWidth, feetToPixel(rwy.length), rwy, rwy.ils);

      let activeArrRunways = getActiveRunways('arr');

      for (let j = 0; j < activeArrRunways.length; j++) {
        const activeArrRwy = activeArrRunways[j];

        if (rwy.ils && runwayIsSame(activeArrRwy, rwy.id)) {
          let mainLandingRunwaySpecs = getRunway(radarAirport, activeArrRwy);
          let runwayInfoIndex = mainLandingRunwaySpecs.id.split('/').indexOf(activeArrRwy);

          let middle = new Vec(
            mainLandingRunwaySpecs.middle.x * resolutionScale,
            mainLandingRunwaySpecs.middle.y * resolutionScale
          );
          let runwayHeading = mainLandingRunwaySpecs.courses.split('/')[runwayInfoIndex];
          ILS.draw(middle, runwayHeading, rwy);
        }
      }
    }
  }

  // Cities
  let cities = getCities(radarAirport);
  if (cities) {
    for (let i = 0; i < cities.length; i++) {
      Shape.draw(cities[i], true);
    }
  }

  // Terrain around airport
  let MEFs = getTerrain(radarAirport); // MEF = Maximum Elevation Figure
  if (MEFs) {
    for (let i = 0; i < MEFs.length; i++) {
      let mef = MEFs[i];
      Shape.draw(mef.points, false);

      // find highest deltaY and deltaX
      let maxDeltaX = 0;
      let dxPoints = [null, null];
      let maxDeltaY = 0;
      let dyPoints = [null, null];
      for (let j = 0; j < MEFs.length; j++) {
        const pointBeingCompared = mef.points[i];
        let currentDeltaX = 0;
        let currentDeltaY = 0;
        for (let k = 0; k < mef.points.length; k++) {
          const comparisonPoint = mef.points[k];
          let dx = pointBeingCompared.x - comparisonPoint.x;
          if (dx < 0) dx *= -1;
          let dy = pointBeingCompared.y - comparisonPoint.y;
          if (dy < 0) dy *= -1;
          if (dx > currentDeltaX) {
            dxPoints = [pointBeingCompared, comparisonPoint];
            currentDeltaX = dx;
          }
          if (dy > currentDeltaY) {
            dyPoints = [pointBeingCompared, comparisonPoint];
            currentDeltaY = dy;
          }
        }
        if (currentDeltaX > maxDeltaX) maxDeltaX = currentDeltaX;
        if (currentDeltaY > maxDeltaY) maxDeltaY = currentDeltaY;
      }

      let leftMostPoint = dxPoints[0].x < dxPoints[1].x ? dxPoints[0] : dxPoints[1];
      let southernMostPoint = dyPoints[0].y > dyPoints[1].y ? dyPoints[0] : dyPoints[1];

      Text.draw(
        mef.mef,
        (leftMostPoint.x + maxDeltaX / 2) * resolutionScale,
        (southernMostPoint.y - maxDeltaY / 2) * resolutionScale,
        false,
        null,
        10,
        terrainMefColor
      );
    }
  }

  let waypoints = getWaypoints(radarAirport);
  if (waypoints) {
    waypoints.forEach(waypoint => {
      switch (waypoint.type) {
        case 'rnav':
          new RNAV(new Vec(waypoint.x, waypoint.y), waypoint.name).draw();
          break;
        case 'vor':
          new VOR(new Vec(waypoint.x, waypoint.y), waypoint.name).draw();
          break;
        case 'vortac':
          new VORTAC(new Vec(waypoint.x, waypoint.y), waypoint.name).draw();
          break;
        case 'vordme':
          new VORDME(new Vec(waypoint.x, waypoint.y), waypoint.name).draw();
          break;

        default:
          break;
      }
    });
  }
}

/* radarCanvas.addEventListener('mousemove', ev => {
  // only request redraw on mousemove
  // so we dont run all the angle calculations
  // every frame
  
  window.requestAnimationFrame(redrawRadarScreen);

  lastMousePos = getMousePos(radarCanvas, ev);

  let heading = getAngle(
    circleCenterAndRadius,
    circleCenterAndRadius,
    lastMousePos.x,
    lastMousePos.y
  );

  trueHeading = Math.ceil(getTrueHeading(heading));
}); */

let lastMouseDownPosition;
let mouseMoveHandler = moveEv => {
  lastMousePos = getMousePos(radarCanvas, moveEv);
  // wait for next anim frame
  new Promise(resolve => {
    window.requestAnimationFrame(redrawRadarScreen); // redraw screen
    window.requestAnimationFrame(resolve);
  }).then(_ => {
    let endingMousePos = getMousePos(radarCanvas, moveEv);

    Line.draw(lastMouseDownPosition, endingMousePos); // THEN draw line

    // calculate relative heading
    let heading = getAngle(
      lastMouseDownPosition.x,
      lastMouseDownPosition.y,
      endingMousePos.x,
      endingMousePos.y
    );

    let trueHeading = Math.ceil(getTrueHeading(heading));

    // snap vector to next standard heading (multiple of 10)
    if (Settings.get('snapHeading')) {
      trueHeading = nextStandardHeading(trueHeading);
    }
    Text.draw(
      trueHeading.toString().padStart(3, '0') + '°',
      lastMousePos.x + (trueHeading >= 180),
      lastMousePos.y - 10,
      true
    );
    // Text.draw(`X: ${lastMouseDownPosition.x}\nY: ${lastMouseDownPosition.y}`, 100, 450);
  });
};

radarCanvas.addEventListener('mousedown', downEv => {
  lastMouseDownPosition = getMousePos(radarCanvas, downEv);

  radarCanvas.addEventListener('mouseup', upEv => {
    // if keepHeadingVector is not enabled, refresh radar
    if (!Settings.get('keepHeadingVector')) window.requestAnimationFrame(redrawRadarScreen);
    radarCanvas.removeEventListener('mousemove', mouseMoveHandler);
  });
  radarCanvas.addEventListener('mousemove', mouseMoveHandler);
});

function getTrueHeading(heading) {
  if (heading == 90 && lastMousePos.y < canvasSize / 2) {
    return 360;
  }
  if (heading >= 270 && heading <= 360) return heading - 270;
  if (heading >= 0 && heading <= 90) return heading + 90;
  if (heading >= 90 && heading <= 180) return heading + 90;
  if (heading >= 180 && heading <= 270) return heading + 90;
}

function nextStandardHeading(hdg) {
  return Math.round(hdg / 5) * 5;
}

function getRunways(icao) {
  let runways = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() == icao) {
        if (!airport?.runwaySpecs) return;
        for (let i = 0; i < airport.runwaySpecs.length; i++) {
          const runway = airport.runwaySpecs[i];
          runways.push(runway);
        }
        break;
      }
    }
  }
  return runways;
}

function getRunway(icao, id) {
  let runways = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() !== icao.toLowerCase()) continue;
      if (!airport?.runwaySpecs) return;
      for (let i = 0; i < airport.runwaySpecs.length; i++) {
        let runway = airport.runwaySpecs[i];
        if (runway.id.includes(id)) return runway;
      }
    }
  }
  return runways;
}

function getCities(icao) {
  let cities = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() == icao) {
        if (!airport?.cities) return;
        for (let i = 0; i < airport.cities.length; i++) {
          cities.push(airport.cities[i]);
        }
        break;
      }
    }
  }
  return cities;
}

function getWaterbodies(icao) {
  let waterBodies = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() == icao) {
        if (!airport?.waterBodies) return;
        for (let i = 0; i < airport.waterBodies.length; i++) {
          waterBodies.push(airport.waterBodies[i]);
        }
        break;
      }
    }
  }
  return waterBodies;
}
function getIslandOutline(icao) {
  let outline = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() == icao) {
        if (!airport?.islandOutline) return;
        for (let i = 0; i < airport.islandOutline.length; i++) {
          outline.push(airport.islandOutline[i]);
        }
        break;
      }
    }
  }
  return outline;
}

function getTerrain(icao) {
  let mefs = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() == icao) {
        if (!airport?.terrain) return;
        for (let i = 0; i < airport.terrain.length; i++) {
          mefs.push(airport.terrain[i]);
        }
        break;
      }
    }
  }
  return mefs;
}

function getWaypoints(icao) {
  let waypoints = [];
  for (const country in airports) {
    for (const airport of airports[country]) {
      if (airport.icao.toLowerCase() == icao) {
        if (!airport?.waypoints) return;
        for (let i = 0; i < airport.waypoints.length; i++) {
          waypoints.push(airport.waypoints[i]);
        }
        break;
      }
    }
  }
  return waypoints;
}

function getActiveRunways(arrivalOrDeparture) {
  let activeUsedRunways = [];
  activeRunways.forEach(rwy => {
    if (rwy.arrivalOrDeparture == arrivalOrDeparture && rwy.active)
      activeUsedRunways.push(rwy.rwyId);
  });
  return activeUsedRunways;
}

function runwayIsSame(rwyId, splitId) {
  let [id1, id2] = splitId.split('/');
  if (rwyId == id1) return true;
  if (rwyId == id2) return true;
  return false;
}
