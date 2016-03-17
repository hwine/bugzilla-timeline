"use strict";

function init(){

  addListeners();
  let email = getEmail();

  if(email !== null){
    onEmailChange(email);
  } else {
    setFormMode();
  }
}

function onEmailChange(email){
  setDashboardMode();
  if(email !== bugzillaEmail){

    if(isZoomed()){
      zoomOut();
    }
    svg.innerHTML = "";
    bugzillaEmail = email;
    document.querySelector('.email').textContent = email;
    emailInput.value = email;

    ApiHandler.getUserBugs(email).then(function(data){
      lanes = [];
      displayedYears = [];
      bugs = data.bugs;
      setDashboardYear((new Date()).getFullYear());
    })
  }
}

function setDashboardMode(){
  formSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
}

function setFormMode(){
  dashboardSection.classList.add('hidden');
  formSection.classList.remove('hidden');
  emailInput.focus();
  emailInput.select();
}

function isFormMode(){
  return !formSection.classList.contains('hidden')
}

function isZoomed(){
  return document.body.classList.contains('zoomed');
}

function getEmail(){
  let urlParamEmail;
  if(window.URLSearchParams){
    urlParamEmail = new URLSearchParams(location.search.substr(1)).get('email');
  } else {
    let fields = location.search.substring(1).split("&");
    let fieldMap = {};
    fields.forEach(function(item){
      let splits = item.split("=");
      fieldMap[splits[0]] = splits[1];
    });
    if(fieldMap.email){
      urlParamEmail = decodeURIComponent(fieldMap.email);
    }
  }


  if(urlParamEmail){
    return urlParamEmail;
  }

  let lsEmail = localStorage.getItem(LS_KEY_EMAIL);
  if(lsEmail !== null){
    return lsEmail;
  }

  return null;
}

function needWhiteText(rgb){
  let values = rgb.replace("rgb(","").replace(")","").replace(" ","").split(",");

  var r = parseInt(values[0],10);
  var g = parseInt(values[1],10);
  var b = parseInt(values[2],10);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  console.log("needWhiteText", values, "yiq", yiq);
  return (yiq < 120);
}

function hideTooltip(){
  if(tooltipEl.innerHTML === ""){
    return;
  }
  tooltipHideId = setTimeout(function(){
    tooltipHideId = null;
    tooltipEl.style.left = `-9999px`;
    tooltipEl.style.top = `0`;
    tooltipEl.style.backgroundColor = "";
    tooltipEl.textContent = "";
    tooltipEl.classList.remove("dark");
  },200);
  return tooltipHideId;
}

function addListeners(){

  document.addEventListener('keydown', onKeyDown);
  form.addEventListener("submit",onFormSubmit, false);
  svg.addEventListener('click',onSvgClick, false);
  svg.addEventListener('mousemove', onMouseMove, false);

  document.querySelector('.edit-email').addEventListener("click", setFormMode);
  document.getElementById('esc').addEventListener('click', zoomOut);

  Array.from(document.querySelectorAll('.year-nav')).forEach(function(btn){
    btn.addEventListener("click", function(){
      let newYear = parseInt(btn.getAttribute("data-year"));
      setDashboardYear(newYear);
    })
  });
}

function onFormSubmit(e){
  let data = new FormData(e.target);
  let email = data.get('email')
  if(email){
    localStorage.setItem(LS_KEY_EMAIL, email);
    history.pushState({}, 'Bugzilla Dashboard for ' + email, location.protocol + location.pathname + '?email=' + email);
    onEmailChange(email);
  }
  e.preventDefault();
}

function onMouseMove(e){
  if(
    e.target.getAttribute('data-tooltip') ||
    (
      !isZoomed() &&
      e.target.parentNode.tagName === 'g' &&
      e.target.parentNode.getAttribute('data-tooltip')
    )
  ){
    let newTarget = e.target.getAttribute('data-tooltip')?e.target:e.target.parentNode;

    if(currentTooltipTarget === null || currentTooltipTarget != newTarget){
      if(tooltipHideId){
        clearTimeout(tooltipHideId);
        tooltipHideId = null;
      }

      currentTooltipTarget = newTarget;

      tooltipEl.innerHTML = e.target.getAttribute('data-tooltip') || e.target.parentNode.getAttribute('data-tooltip');

      let left = e.clientX - (tooltipEl.clientWidth / 2);
      let top = e.clientY + (DETAIL_PADDING * (isZoomed()?3:1));
      if(left < 0){
        left = DETAIL_PADDING;
      } else if(left + tooltipEl.clientWidth > document.body.clientWidth){
        left = document.body.clientWidth - tooltipEl.clientWidth - DETAIL_PADDING;
      }

      if(top + tooltipEl.clientHeight > document.body.clientHeight){
        top = e.clientY - tooltipEl.clientHeight - DETAIL_PADDING;
      }

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
      if(e.target.getAttribute('stroke')){
        tooltipEl.style.backgroundColor = e.target.getAttribute('stroke');
      }
      if(e.target.getAttribute('fill')){
        tooltipEl.style.backgroundColor = e.target.getAttribute('fill');
      }
      if(needWhiteText(tooltipEl.style.backgroundColor)){
        tooltipEl.classList.add("dark");
      } else {
        tooltipEl.classList.remove("dark");
      }
    }
  } else {
    currentTooltipTarget = null;
    if(!tooltipHideId){
      hideTooltip();
    }
  }
}

function onKeyDown(e){
  let formMode = isFormMode();
  let zoomed = isZoomed();

  if(e.key === 'Escape' || e.code === 'Escape'){
    if(formMode && bugzillaEmail){
      setDashboardMode();
    }
    if(zoomed) {
      zoomOut();
    }
    return;
  }

  if(!formMode && !zoomed && (e.key === 'ArrowRight' || e.code === 'ArrowRight')){
    if(currentYear !== (new Date()).getFullYear()){
      setDashboardYear(currentYear + 1);
      return;
    }
  }

  if(!formMode && !zoomed && (e.key === 'ArrowLeft' || e.code === 'ArrowLeft')){
    if(currentYear !== BUGZILLA_BIRTH_YEAR){
     setDashboardYear(currentYear - 1);
     return;
    }
  }

  if(!formMode && !zoomed && (e.key === 'ArrowDown' || e.code === 'ArrowDown')){
    if(isMoving){
      return;
    }
    if(svg.viewBox.baseVal.y + svg.viewBox.baseVal.height < ((lanes.length - 1) * LINE_HEIGHT)){
      panViewBox(svg.viewBox.baseVal.x, svg.viewBox.baseVal.y + svg.viewBox.baseVal.height);
      navEl.classList.add('scrolled');
    }
  }

  if(!formMode && !zoomed && (e.key === 'ArrowUp' || e.code === 'ArrowUp')){
    if(isMoving){
      return;
    }
    if(svg.viewBox.baseVal.y > 0){
      panViewBox(svg.viewBox.baseVal.x, svg.viewBox.baseVal.y - svg.viewBox.baseVal.height);
      if(svg.viewBox.baseVal.y - svg.viewBox.baseVal.height === 0){
        navEl.classList.remove('scrolled');
      }
    }
  }
}

function onSvgClick(e){
  if(!isZoomed()){
    if(
      e.target.classList.contains('bug-line') ||
      e.target.parentElement.classList.contains('bug-line')
    ) {
      var el = e.target;
      if(!el.classList.contains('bug-line')){
        el = e.target.parentElement;
      }
      if(e.ctrlKey || e.metaKey){
        window.open("https://bugzilla.mozilla.org/show_bug.cgi?id=" + el.getAttribute("data-bug-id"));
      } else {
        zoomInBug(el);
      }
    }
  }
}

function setDashboardYear(year){
  if(isMoving){
    return;
  }
  currentYear = year;

  document.querySelector('nav .year').textContent = year;

  panViewBox((year - BUGZILLA_BIRTH_YEAR) * svg.viewBox.baseVal.width);
  updateDashboardNavigation(year);

  if(displayedYears.indexOf(year) === -1){
    displayedYears.push(year);
    drawMonths(year);
    drawWeeks(year);
    fetchBugsHistoryForYear(year).catch((ex) => console.error(ex));
  }
};

function panViewBox(toX, toY, duration){
  if(typeof toY === "undefined"){
    toY = svg.viewBox.baseVal.y;
  }

  if(typeof duration === "undefined"){
    duration = 200;
  }

  isMoving = true;
  hideTooltip();
  let xStart = svg.viewBox.baseVal.x;
  let xDelta = svg.viewBox.baseVal.x - toX;

  let yStart = svg.viewBox.baseVal.y;
  let yDelta = svg.viewBox.baseVal.y - toY;



  let start;
  let pan = function(timestamp ){
    if (!start){
      start = timestamp
    };
    let t = (timestamp - start)/duration;
    // Easing function https://gist.github.com/gre/1650294
    t = t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
    if (t <= 1) {
      svg.viewBox.baseVal.x = xStart - (xDelta  * t);
      svg.viewBox.baseVal.y = yStart - (yDelta  * t);
      requestAnimationFrame(pan);
    } else {
      svg.viewBox.baseVal.x = toX;
      svg.viewBox.baseVal.y = toY;
      isMoving = false;
    }
  }
  requestAnimationFrame(pan);
}

function updateDashboardNavigation(year){
  let previousYearButton = document.querySelector(".year-nav[data-direction=previous]");
  let nextYearButton = document.querySelector(".year-nav[data-direction=next]");

  previousYearButton.setAttribute("data-year", year - 1);
  nextYearButton.setAttribute("data-year", year + 1);

  if( year === (new Date()).getFullYear()){
    nextYearButton.setAttribute('disabled', true);
    nextYearButton.setAttribute('title', "You can't go to the future, Marty");
  } else {
    nextYearButton.removeAttribute('disabled');
    nextYearButton.removeAttribute('title');
  }

  if( year === BUGZILLA_BIRTH_YEAR){
    previousYearButton.setAttribute('disabled', true);
    previousYearButton.setAttribute('title', "You can't go further, Bugzilla did not exists before");
  } else {
    previousYearButton.removeAttribute('disabled');
    previousYearButton.removeAttribute('title');
  }

}

function fetchBugsHistoryForYear(year){
  document.querySelector('nav').classList.add('loading');
  let firstMonday = getMondayOfFirstWeek(year);

  let yearBugs = bugs.filter(function(x){
    if(x.displayed){
      return false;
    }

    if(!x.cf_last_resolved){
      return true;
    }

    return (new Date(x.cf_last_resolved) >= firstMonday);
  });

  yearBugs.sort(function(a, b){
    // If bugs have not the same state
    if(a.cf_last_resolved != b.cf_last_resolved){
      // If "a" is not resolved, a comes first
      if(a.cf_last_resolved == null){
        return -1;
      }

      // If "b" is not resolved, b comes first
      if(b.cf_last_resolved == null){
        return 1;
      }
    }

    var priorityA = (PRIORITY_REGEX.test(a.priority)?a.priority:'P3');
    var priorityB = (PRIORITY_REGEX.test(b.priority)?b.priority:'P3');
    // "a" and "b" are in the same state ( both resolved, or both unresolved)
    // we want to get the higher priority bugs first
    if(priorityA != priorityB){
      return priorityA < priorityB ? -1:1;
    }

    // "a" and "b" are in the same state (both resolved, or both unresolved)
    // and have the same priority
    // We want to get the older bugs first
    return a.creation_time < b.creation_time ? -1 : 1;
  });

  return yearBugs.reduce(function(previousBugPromise, bug, idx){
    return new Promise(function(resolve, reject){
      var historyPromise = ApiHandler.getBugHistory(bug).then(function(history){
        bug.history = history;

        // A bug is being worked on by the user when :
        // - creates the bug
        // - changes the bug
        // - is cc'ed on the bug
        // - is assigned on the bug
        bug.history.some(function(activity){

          var hasAssignement = (activity.who === bugzillaEmail);
          if(!hasAssignement){
            activity.changes.some(function(change){
              return (
                (
                  change.field_name === 'cc' ||
                  change.field_name === 'assigned_to'
                ) && change.added === bugzillaEmail
              );
            });
          }

          if(hasAssignement === true){
            bug.startDate = new Date(activity.when);
            return true;
          }
        });

        if(!bug.startDate && bug.assigned_to === bugzillaEmail){
          bug.startDate = new Date(bug.creation_time);
        }


        if(bug.cf_last_resolved){
          bug.endDate = new Date(bug.cf_last_resolved);
        } else {
          bug.endDate = new Date();
        }

        return Promise.resolve(bug);
      });

      var promises = [historyPromise,previousBugPromise];
      Promise.all(promises).then(function(data){
        let bug = data[promises.indexOf(historyPromise)];
        let idx = bugs.findIndex((item) => item.id === bug.id);
        if(idx != -1){
          bugs[idx] = bug;
        }
        drawBug(bug);
        bug.displayed = true;
        resolve();
      });
    });
  }, Promise.resolve())
  .then(function(){
    document.querySelector('nav').classList.remove('loading');
  })
  .catch((e) => console.error(e));
}

function getMondayOfFirstWeek(year){
  // First week of the year is the week where is January 4th
  let currentYearJan4 = new Date(`${year}-01-04`);
  return new Date(currentYearJan4.getTime() - ((currentYearJan4.getDay() - MONDAY_INDEX) * MILLISECOND_A_DAY));
}

function getPositionFromDate(date, period){
    if(period){
      let start = period[0];
      let end = period[1];
      let length = (end - start);
      if(length === 0){
        let percent = (date - start)/length;

        let periodStart = svg.viewBox.baseVal.x + DETAIL_PADDING;
        let periodEnd = svg.viewBox.baseVal.x + YEAR_WIDTH - DETAIL_PADDING;

        return periodEnd + ( end - date );
      } else {
        let percent = (date - start)/length;

        let periodStart = svg.viewBox.baseVal.x + DETAIL_PADDING;
        let periodEnd = svg.viewBox.baseVal.x + YEAR_WIDTH - DETAIL_PADDING;
        let periodLength = periodEnd - periodStart;

        return periodStart + ( periodLength  * percent );
      }
    }

    return (date - getMondayOfFirstWeek(BUGZILLA_BIRTH_YEAR))/MILLISECOND_A_DAY;
}

function findLane(start, end){
  var lane = 0;
  var safe_space = 8;
  start = start - safe_space;
  end = end + safe_space;
  for(;lane < lanes.length;lane++){
    var fit = lanes[lane].every(function(xs){
      return !(
        ( xs[0] >= start && xs[0] <= end ) ||
        ( start >= xs[0] && start <= xs[1] )
      );
    });
    if(fit === true){
      break;
    }
  }
  return lane;
}

function createSVGElement(tagName, attributes){
  let el = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  for(let key in attributes){
    el.setAttribute(key, attributes[key])
  }
  return el;
}

function drawBug(bug){
  if(bug.startDate){
    var strokeWidth = 2;
    var endCircleR = 1.75;
    var minMultiplier = 0.25;
    var maxMultiplier = 1.75;

    if(PRIORITY_REGEX.test(bug.priority)){
      var priorityRatio = minMultiplier + ((((-1.25/5) * bug.priority[1]) + 1.25) * (maxMultiplier - minMultiplier));
      strokeWidth = strokeWidth * priorityRatio;
      endCircleR = endCircleR * priorityRatio;
    }

    var colorIndex = (bug.id % (COLORS.length - 1));
    var bugColor = COLORS[colorIndex];

    var startPoint = getPositionFromDate(bug.startDate);
    var endPoint = getPositionFromDate(bug.endDate);
    var laneNumber = findLane(startPoint,endPoint);

    if(!lanes[laneNumber]){
      lanes[laneNumber] = [];
    }
    lanes[laneNumber].push([startPoint,endPoint]);
    var y = (LINE_HEIGHT * 1.5) + (laneNumber * LINE_HEIGHT);
    var bugGroup = createSVGElement("g", {
      "class": "bug-line",
      "data-bug-id": bug.id,
      "data-tooltip": `
        Bug ${bug.id}
        ${PRIORITY_REGEX.test(bug.priority)?" [" + bug.priority + "]":""}
        <hr>
        ${bug.summary}`
    });

    if(bug.cf_last_resolved && bug.resolution == 'FIXED'){
      var endCircle = createSVGElement("circle", {
        "class": "resolved",
        "cx": endPoint,
        "cy": y,
        "r": endCircleR,
        "fill": bugColor
      });
      bugGroup.appendChild(endCircle);
    }

    var bugAssignedLine = createSVGElement("line",{
      "x1": startPoint,
      "y1": y,
      "x2": endPoint,
      "y2": y,
      "stroke": bugColor,
      "stroke-width": strokeWidth,
      "stroke-linecap": "round"
    });
    bugGroup.appendChild(bugAssignedLine);
    svg.appendChild(bugGroup);
  }
}

function drawWeeks(year){

  let weekGroup = createSVGElement("g");
  let firstDay = getMondayOfFirstWeek(year);
  weekGroup.classList.add('weeks');
  for(var i = 0; i <= 52; i++){
    let monday = new Date(firstDay.getTime() + (i * 7 * MILLISECOND_A_DAY));
    let x = getPositionFromDate(monday);
    let weekLine = createSVGElement("line", {
      "x1": x,
      "y1": 0,
      "x2": x,
      "y2": 10000,
      "stroke": "rgba(0,0,0,0.3)",
      "stroke-width": 0.1
    });
    weekGroup.appendChild(weekLine);
  }
  svg.insertBefore(weekGroup,svg.firstChild);
}

function drawMonths(year){

  let monthGroup = createSVGElement("g",{
    "class": "months"
  });
  let monthWidth = 5;

  for(var i = 0; i < 12; i++){
    let firstDay = new Date(year, i, 1,0,0,0);
    let x = getPositionFromDate(firstDay);
    let monthLine = createSVGElement("line", {
      "x1": x,
      "y1": 0,
      "x2": x,
      "y2": 10000,
      "stroke": "#FFC107",
      "stroke-width": 0.5,
      "stroke-opacity": 0.5
    });

    let monthText = createSVGElement("text", {
      "x": (x + monthWidth/2),
      "y": (monthWidth - 1) ,
      "font-size": 4,
      "font-family": "Signika",
      "fill": "rgba(0,0,0,0.5)",
      "text-anchor": "middle",
      "title": MONTHS[i]
    });
    monthText.innerHTML = MONTHS[i][0];

    let monthRect =  createSVGElement("rect", {
      "x" : x,
      "y" : 0,
      "width" : monthWidth,
      "height" : monthWidth,
      "fill" : "#FFC107"
    });

    monthGroup.appendChild(monthRect);
    monthGroup.appendChild(monthLine);
    monthGroup.appendChild(monthText);
  }

  svg.insertBefore(monthGroup,svg.firstChild);
}

function zoomInBug(el){
    isMoving = true;
    hideTooltip();

    var id = el.getAttribute("data-bug-id");
    var bugData = bugs.find(function(item){
      return (item.id == id);
    });
    bugTitleEl.innerHTML =`<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=${id}" target="blank">Bug ${id} - ${bugData.summary}</a>`;

    var line = el.querySelector('line');

    var duration = 500;
    var x1 = parseFloat(line.getAttribute("x1"));
    var x2 = parseFloat(line.getAttribute("x2"));
    var y = parseFloat(line.getAttribute("y1"));
    var strokeWidth = parseFloat(line.getAttribute("stroke-width"));

    line.setAttribute("data-x1",x1);
    line.setAttribute("data-x2",x2);
    line.setAttribute("data-y",y);
    line.setAttribute("data-stroke-width",strokeWidth);

    let lineStart = svg.viewBox.baseVal.x + DETAIL_PADDING;
    let lineEnd = svg.viewBox.baseVal.x + YEAR_WIDTH - DETAIL_PADDING;

    var x1FromStart = x1 - lineStart;
    var x1MoveByMs = x1FromStart/duration;
    var x2FromStart = lineEnd - x2;
    var x2MoveByMs = x2FromStart/duration;
    var yFromMiddle = svg.viewBox.baseVal.y + 60 - y;
    var yMoveByMs = yFromMiddle/duration;
    var finalStrokeWidth = 20;
    var strokeWidthMoveByMs = (finalStrokeWidth - strokeWidth)/duration;
    var start = 0;

    function zoom(timestamp) {
      if (!start) start = timestamp;
      var progress = timestamp - start;
      if (progress < duration) {
        line.setAttribute('x1',x1 - (x1MoveByMs * progress));
        line.setAttribute('x2',x2 + (x2MoveByMs * progress));
        line.setAttribute('y1',y + (yMoveByMs * progress));
        line.setAttribute('y2',y + (yMoveByMs * progress));
        line.setAttribute('stroke-width',strokeWidth + (strokeWidthMoveByMs*progress));
        requestAnimationFrame(zoom);
      } else {
        line.setAttribute('x1', lineStart);
        line.setAttribute('x2', lineEnd );
        line.setAttribute('y1',svg.viewBox.baseVal.y + 60);
        line.setAttribute('y2',svg.viewBox.baseVal.y + 60);
        line.setAttribute('stroke-width',finalStrokeWidth);

        drawBugDetail(el, bugData);
        isMoving = false;
      }
    }

    requestAnimationFrame(zoom);

    document.body.classList.add('zoomed');
    el.classList.toggle('detail');
}

function drawBugDetail(el, bugData){
  let bugPeriod = [bugData.startDate, bugData.endDate];
  let y = svg.viewBox.baseVal.y + 60;

  let bugGroup = createSVGElement("g", {
    "class": "detail-bug-line"
  });

  if(bugData.endDate && bugData.resolution == 'FIXED'){
    let endCircle = createSVGElement("circle", {
      "cx": getPositionFromDate(bugData.endDate,bugPeriod),
      "cy": y,
      "r": 9,
      "fill": "rgba(0,0,0,0.3)",
      "data-tooltip":`RESOLVED ${bugData.cf_last_resolved}`
    });
    bugGroup.appendChild(endCircle);
  }

  let bugLine = createSVGElement("line", {
    "x1": getPositionFromDate(new Date(bugData.creation_time),bugPeriod),
    "y1": y,
    "x2": getPositionFromDate(bugData.endDate,bugPeriod),
    "y2": y,
    "stroke": "rgba(0,0,0,1)",
    "stroke-width": 2,
    "stroke-linecap": "round"
  });
  bugGroup.appendChild(bugLine);

  let groups = [];
  let historyEntries = [];
  bugData.history.forEach(function(entry){
    if(! userColor[entry.who]){
      if(USERS_COLORS.length === 0){
        USERS_COLORS = COLORS.map((x) => x);
      }
      userColor[entry.who] = USERS_COLORS.shift();
    }
    let entryColor = userColor[entry.who];


    let entryTitleList = document.createElement('ul');
    entry.changes.sort(function(a, b){
      if(a.added == "" && a.added === b.added){
        return 0;
      }
      return a.added !== 0 ? -1: 0;
    });

    entry.changes.forEach(function(change){
      let li = document.createElement('li');
      li.innerHTML = change.field_name + ' ' + (
        change.removed !== '' ? '<span class="removed">' + change.removed + '</span>':''
      ) + (
        change.added !== '' ? ' ➜ ' + change.added:''
      ) + ' ';
      entryTitleList.appendChild(li);
    });
    let entryTitle = `${entry.when} - ${entry.who}<hr>${entryTitleList.outerHTML}`;

    historyEntries.push({
      x : getPositionFromDate(new Date(entry.when),bugPeriod),
      title: entryTitle,
      color: entryColor,
      mine: entry.who === bugzillaEmail
    });
  });

  historyEntries.sort(function(a, b){
    return a.x > b.x ? 1 : -1;
  });
  historyEntries.reduce(function(previousValue, currentValue, currentIndex, array){
    if(groups.length > 0 && previousValue && currentValue.x - previousValue.x < 10){
      groups[groups.length - 1].push(currentValue);
    } else {
      groups.push([currentValue]);
    }
    return currentValue;
  },null);

  var circleR = 10;

  groups.forEach(function(group, index){
    var groupGroup = createSVGElement("g");

    var strokeWidth = 2;
    var x1 = group[0].x;
    var x2 = group[group.length - 1].x;

    var groupLine = createSVGElement("line", {
      "x1": x1,
      "x2": x2,
      "y1": y,
      "y2": y,
      "stroke": "rgba(0,0,0,1)",
      "stroke-width": 12,
      "stroke-linecap": "round"
    });
    groupGroup.appendChild(groupLine);

    var clipId = "group-"+index;
    var groupClipath = createSVGElement("clipPath", {
      "id": clipId
    });

    var startCircleClip = createSVGElement("circle", {
      "cx": x1,
      "cy": y,
      "r": (circleR / 2)
    });

    var endCircleClip = createSVGElement("circle", {
      "cx": x2,
      "cy": y,
      "r": (circleR / 2)
    });

    var rectClip = createSVGElement("rect", {
      "x": x1,
      "y": (y - (circleR/2)),
      "height": circleR,
      "width": (x2-x1)
    });

    groupClipath.appendChild(startCircleClip);
    groupClipath.appendChild(endCircleClip);
    groupClipath.appendChild(rectClip);

    groupGroup.appendChild(groupClipath);

    let stroke = 0.5;

    var groupStart = x1 - (circleR / 2) - stroke;
    var groupEnd = x2 + (circleR / 2) + stroke;
    var entryWidth = (groupEnd - groupStart)/group.length;
    group.forEach(function(groupEntry, idx){
      var entryRect = createSVGElement("rect", {
        "x": groupStart  + (entryWidth * idx) ,
        "width": entryWidth ,
        "fill": groupEntry.color,
        "stroke": "black",
        "data-tooltip": groupEntry.title,
        "y": y - circleR ,
        "height": circleR * 2,
        "stroke-width": stroke,
        "clip-path": `url(#${clipId})`
      });
      groupGroup.appendChild(entryRect);
    })

    bugGroup.appendChild(groupGroup);
  });

  el.appendChild(bugGroup);

  let daysOfAssignement = (bugData.endDate.getTime() - bugData.startDate.getTime() ) / MILLISECOND_A_DAY;

  let yearHorizontalLine = createSVGElement("line", {
    "x1": svg.viewBox.baseVal.x,
    "x2": svg.viewBox.baseVal.x + svg.viewBox.baseVal.width,
    "y1": y - 50,
    "y2": y - 50,
    "stroke": "black",
    "stroke-opacity": 0.4,
    "stroke-width": 0.2
  });
  bugGroup.insertBefore(yearHorizontalLine,bugGroup.firstChild);

  let monthHorizontalLine = createSVGElement("line", {
    "x1": svg.viewBox.baseVal.x,
    "x2": svg.viewBox.baseVal.x + svg.viewBox.baseVal.width,
    "y1": y - 40,
    "y2": y - 40,
    "stroke": "black",
    "stroke-opacity": 0.4,
    "stroke-width": 0.2
  });
  bugGroup.insertBefore(monthHorizontalLine,bugGroup.firstChild);

  if( daysOfAssignement < 45) {
    let dayHorizontalLine = createSVGElement("line", {
      "x1": svg.viewBox.baseVal.x,
      "x2": svg.viewBox.baseVal.x + svg.viewBox.baseVal.width,
      "y1": y - 30,
      "y2": y - 30,
      "stroke": "black",
      "stroke-opacity": 0.4,
      "stroke-width": 0.2
    });
    bugGroup.insertBefore(dayHorizontalLine,bugGroup.firstChild);

    for(var i = 0; i <= daysOfAssignement + 2 ; i++){
      var day = new Date(bugData.startDate.getTime() + ( i * MILLISECOND_A_DAY));
      day.setHours(0,0,0);
      var pos = getPositionFromDate(day,bugPeriod);
      var dayLine = createSVGElement("line", {
        "x1": pos,
        "y1": y - 40,
        "x2": pos,
        "y2": y + circleR,
        "stroke": "black",
        "stroke-opacity": 0.1,
        "stroke-width": .5
      });
      bugGroup.insertBefore(dayLine,bugGroup.firstChild);

      if(pos < svg.viewBox.baseVal.x ){
        pos = svg.viewBox.baseVal.x;
      }
      var dayText = createSVGElement("text", {
        "x": (pos + 1),
        "y": (y - 40 + 8),
        "font-size": 8,
        "font-family": "Signika",
        "fill": "#666"
      });
      dayText.textContent = day.getDate();

      let tomorrow = new Date(day.getTime() +  MILLISECOND_A_DAY);
      let nextPos = getPositionFromDate(tomorrow, bugPeriod);
      if(nextPos < svg.viewBox.baseVal.x ){
        nextPos = svg.viewBox.baseVal.x;
      }

      if( nextPos - pos > 10){
        bugGroup.insertBefore(dayText, bugGroup.firstChild);
      }
    }
  }

  let monthsAssigned = Math.ceil((bugData.endDate.getTime() - bugData.startDate.getTime() ) / MILLISECOND_A_DAY / 30);
  if(monthsAssigned < 36){
    let firstDayOfMonth = new Date(bugData.startDate.getFullYear(),bugData.startDate.getMonth(),1);
    for(var i = 0; i <= Math.ceil((bugData.endDate.getTime() - bugData.startDate.getTime() ) / MILLISECOND_A_DAY / 30) ; i++){
      var day = new Date(bugData.startDate.getTime() + ( i * MILLISECOND_A_DAY));
      firstDayOfMonth.setHours(0,0,0);
      var pos = getPositionFromDate(firstDayOfMonth,bugPeriod);
      var monthLine = createSVGElement("line", {
        "x1": pos,
        "y1": y - 50,
        "x2": pos,
        "y2": y + circleR,
        "stroke": "black",
        "stroke-opacity": 0.1,
        "stroke-width": .5,
      });
      bugGroup.insertBefore(monthLine,bugGroup.firstChild);

      if(pos < svg.viewBox.baseVal.x ){
        pos = svg.viewBox.baseVal.x;
      }

      var monthText = createSVGElement("text", {
        "x": pos + 1,
        "y": y - 50 + 8 ,
        "font-size": 8,
        "font-family": "Signika",
        "fill": "#666"
      });

      let monthNumber = firstDayOfMonth.getMonth();
      if(monthsAssigned < 9){
        monthText.textContent = MONTHS[monthNumber];
      } else {
        monthText.textContent = (monthNumber < 9?"0":"") + (monthNumber + 1);
      }

      bugGroup.insertBefore(monthText, bugGroup.firstChild);

      let nextMonth = firstDayOfMonth.getMonth() + 1;
      firstDayOfMonth.setMonth(nextMonth);
      if(nextMonth === 0){
        firstDayOfMonth.setFullYear(firstDayOfMonth.getFullYear() + 1);
      }
    }
  }

  let startYear = bugData.startDate.getFullYear();
  let endYear = bugData.endDate.getFullYear();
  for(var i = 0; i <= endYear - startYear; i++){
    let firstDayOfYear = new Date(startYear + i, 0, 1);
    firstDayOfYear.setHours(0,0,0);

    var pos = getPositionFromDate(firstDayOfYear,bugPeriod);
    var yearLine = createSVGElement("line",{
      "x1": pos,
      "y1": y - 60,
      "x2": pos,
      "y2": y + circleR,
      "stroke": "black",
      "stroke-opacity": 0.1,
      "stroke-width": .5
    });
    bugGroup.insertBefore(yearLine,bugGroup.firstChild);

    if(pos < svg.viewBox.baseVal.x ){
      pos = svg.viewBox.baseVal.x;
    }
    var yearText = createSVGElement("text", {
      "x": pos + 1,
      "y": y - 60 + 8 ,
      "font-size": 8,
      "font-family": "Signika",
      "fill": "#666"
    });
    yearText.textContent = startYear + i;
    bugGroup.insertBefore(yearText, bugGroup.firstChild);
  };
}

function zoomOut(){
  hideTooltip();
  var zoomedEl = document.querySelector('.detail');
  if(zoomedEl){
    var detail = zoomedEl.querySelector('.detail-bug-line');
    if(detail){
      detail.remove();
    }

    var line = zoomedEl.querySelector('line');
    var duration = 500;
    var x1 = parseFloat(line.getAttribute("x1"));
    var x2 = parseFloat(line.getAttribute("x2"));
    var y = parseFloat(line.getAttribute("y1"));
    var strokeWidth = parseFloat(line.getAttribute("stroke-width"));

    var initialX1 = parseFloat(line.getAttribute("data-x1"));
    var initialX2 = parseFloat(line.getAttribute("data-x2"));
    var initialY = parseFloat(line.getAttribute("data-y"));
    var initialStrokeWidth = parseFloat(line.getAttribute("data-stroke-width"));

    var x1Move = x1 - initialX1;
    var x1MoveByMs = x1Move/duration;
    var x2Move = x2 - initialX2;
    var x2MoveByMs = x2Move/duration;
    var yMove = y - initialY;
    var yMoveByMs = yMove/duration;
    var strokeWidthMoveByMs = (strokeWidth - initialStrokeWidth)/duration;
    var start = 0;
    let zoomOut = function(timestamp) {
      if (!start) start = timestamp;
      var progress = timestamp - start;
      if (progress < duration) {
        line.setAttribute('x1',x1 - (x1MoveByMs*progress));
        line.setAttribute('x2',x2 - (x2MoveByMs*progress));
        line.setAttribute('y1',y - (yMoveByMs*progress));
        line.setAttribute('y2',y - (yMoveByMs*progress));
        line.setAttribute('stroke-width',strokeWidth - (strokeWidthMoveByMs*progress));
        requestAnimationFrame(zoomOut);
      } else {
        line.setAttribute('x1',initialX1);
        line.setAttribute('x2',initialX2);
        line.setAttribute('y1',initialY);
        line.setAttribute('y2',initialY);
        line.setAttribute('stroke-width',initialStrokeWidth);
        document.querySelector('.bug-title').innerHTML = currentYear;
        zoomedEl.classList.remove('detail');
        document.body.classList.remove('zoomed');
      }
    }
    requestAnimationFrame(zoomOut);
  }
}

const LS_KEY_EMAIL = 'bugzilla-email';
const X_PADDING = 0;
const LINE_HEIGHT = 7.5;
const DETAIL_PADDING = 15;
const MONDAY_INDEX = 1;
const MILLISECOND_A_DAY = (1000*60*60*24);
const BUGZILLA_BIRTH_YEAR = 1998;
const MONTHS = ['January','February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const COLORS = ["rgb(244, 67, 54)","rgb(0, 150, 136)","rgb(96, 125, 139)","rgb(156, 39, 176)","rgb(103, 58, 183)","rgb(63, 81, 181)","rgb(33, 150, 243)","rgb(3, 169, 244)","rgb(0, 188, 212)","rgb(76, 175, 80)","rgb(139, 195, 74)","rgb(255, 193, 7)","rgb(255, 152, 0)","rgb(255, 87, 34)","rgb(233, 30, 99)","rgb(121, 85, 72)"];
const PRIORITY_REGEX = /^P[1-5]$/;
var USERS_COLORS = COLORS.map((x) => x);

var lanes = [];
var bugs = [];
var displayedYears = [];
var bugzillaEmail = null;

let userColor = {};

let currentYear = (new Date()).getFullYear();
let isMoving = false;

let svg = document.querySelector('svg');
let blurFilterEl = document.querySelector('feGaussianBlur');

let formSection = document.querySelector('section.form');
let form = formSection.querySelector('form');
let emailInput = form.querySelector('input[name=email]');
let dashboardSection = document.querySelector('section.dashboard');
let bugTitleEl = document.querySelector('.bug-title');
let navEl = document.querySelector('nav');

let currentTooltipTarget;
let tooltipEl = document.createElement("div");
tooltipEl.classList.add("tooltip");
document.body.appendChild(tooltipEl);
let tooltipHideId;


const YEAR_WIDTH = svg.viewBox.baseVal.width;

init();
