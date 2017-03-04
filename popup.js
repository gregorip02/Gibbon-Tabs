document.onkeydown = function(event) {
  event = event || window.event;
  // Escape key
  if (event.keyCode == 27) {
    chrome.storage.local.clear(function() {
      var error = chrome.runtime.lastError;
      if (error) {
        console.error(error);
      }
    });
    window.close();
  }
  // Down arrow key
  if (event.keyCode == 40) {
    removeHighlight(highlightIndex);
    if (highlightIndex < numTabs) ++highlightIndex;
    highlightTab(highlightIndex, true);
    return;
  }
  // Up arrow key
  if (event.keyCode == 38) {
    removeHighlight(highlightIndex);
    if (highlightIndex > 1) --highlightIndex;
    highlightTab(highlightIndex, true);
    return;
  }
  // Enter key
  if (event.keyCode == 13) {
    activateTab(highlightIndex);
  }
};

function activateTab(tabIndex) {
  var tab = tabsToRender[tabIndex - 1];
  chrome.windows.update(tab.windowId, { focused : true });
  chrome.tabs.update(tab.tabId, {
    active: true,
    highlighted: true
  });
  window.close();
}

function removeHighlight(tabIndex) {
  var active = document.getElementById("search_id_" + tabIndex);
  if (active !== null) {
    active.classList.remove("highlighted");
  }
}

function isScrolledIntoView(el) {
  var elemTop = el.getBoundingClientRect().top;
  var elemBottom = el.getBoundingClientRect().bottom;
  return (elemTop >= 0) && (elemBottom <= window.innerHeight);
}

var TAB_BORDER_COLORS = ["#568AF2", "#DE5259", "#1AA15F", "#FFCE45"];
function highlightTab(tabIndex, shouldScrollIntoView) {
  var toHighlight = document.getElementById("search_id_" + tabIndex);
  if (toHighlight !== null) {
    toHighlight.classList.add("highlighted");
    if (shouldScrollIntoView && !isScrolledIntoView(toHighlight)) toHighlight.scrollIntoView(false);
    toHighlight.style["border-left-color"] = TAB_BORDER_COLORS[tabIndex % 4];
  }
}

var lastCursorPos = { x: 0, y: 0};
function highlightTabOnHover(tabIndex, event) {
  var currentCursorPos = { x: event.screenX, y: event.screenY };
  if (lastCursorPos.x == currentCursorPos.x &&
      lastCursorPos.y == currentCursorPos.y) {
    // Mouse didn't move, don't process hover event
    return;
  }
  lastCursorPos.x = currentCursorPos.x;
  lastCursorPos.y = currentCursorPos.y;

  removeHighlight(highlightIndex);
  highlightIndex = tabIndex;
  highlightTab(tabIndex, false);
}

function getAllTabs(callback) {
  var queryInfo = {};
  chrome.tabs.query(queryInfo, function(tabs) {
    callback(tabs);
  });
}

function showSaveSnapshotMenu() {
  var saveSnapButtonRect = document.getElementById('save_snap_button').getBoundingClientRect();
  var saveSnapMenu = document.getElementById("save_snap_menu");
  if (saveSnapMenu.style.display == "initial") {
    saveSnapMenu.style.display = "none";
    return;
  }

  document.getElementById('save_snap_name_input').value = "";
  saveSnapMenu.style.left = saveSnapButtonRect.left + "px";
  saveSnapMenu.style.top = saveSnapButtonRect.bottom + "px";
  saveSnapMenu.style.display = "initial";
}

function saveSnapshot() {
  var snapshotName = document.getElementById('save_snap_name_input').value;
  var saveSnapshotButton = document.getElementById('submit_save_snap_button');
  if (snapshotName == "") {
    alert("Please specify a name for the snapshot.");
    return;
  }
  getTabsSnapshots(function(tabSnapsObj) {
    getAllTabs(function (tabs) {
      var newSnapshot = {
        name: snapshotName,
        tabs: tabs
      };
      if (tabSnapsObj.tabSnaps === undefined) {
        tabSnapsObj.tabSnaps = { listOfSnaps: [] };
      }
      tabSnapsObj.tabSnaps.listOfSnaps.push(newSnapshot);
      chrome.storage.local.set({ "tabSnaps": tabSnapsObj.tabSnaps }, function() {
        var originalBackground = saveSnapshotButton.style.background;
        var originalText = saveSnapshotButton.value;
        var saveSnapshotMenu = document.getElementById('save_snap_menu');
        saveSnapshotButton.style.background = "#69B578";
        saveSnapshotButton.innerText = "Success!";
        setTimeout(function() {
          saveSnapshotButton.style.background = originalBackground;
          saveSnapshotButton.innerText = originalText;
          hideElement(saveSnapshotMenu);
        }, 1000);
        console.log("Save successfully!");
      });
    });
  });
}

function renderListOfSnapshots() {
  var getSnapsButtonRect = document.getElementById('get_snaps_button').getBoundingClientRect();
  var tabSnapsDropdown = document.getElementById("tab_snaps_dropdown");
  if (tabSnapsDropdown.style.display == "initial") {
    tabSnapsDropdown.style.display = "none";
    return;
  }

  getTabsSnapshots(function(tabSnapsObj) {
    var tabSnapsHtml = "<div id=\"tab_snap_container\">";
    if (tabSnapsObj.tabSnaps !== undefined) {
      tabSnapsHtml += "<p class=\"snap_action_title\">Tab Snapshots</p>"
      for (let tabSnap of tabSnapsObj.tabSnaps.listOfSnaps) {
        tabSnapsHtml += "<div class=\"tab_snap_box\">" + tabSnap.name + "</div>";
      }
    } else {
      tabSnapsHtml = "<p id=\"no_snaps_message\">You haven't saved any tab snapshots!</p>";
    }
    tabSnapsHtml += "</div>";

    tabSnapsDropdown.style.left = getSnapsButtonRect.left + "px";
    tabSnapsDropdown.style.top = getSnapsButtonRect.bottom + "px";
    tabSnapsDropdown.style.display = "initial";
    tabSnapsDropdown.onmouseleave = hideElement.bind(null, tabSnapsDropdown);
    document.getElementById('tab_snaps_dropdown').innerHTML = tabSnapsHtml;

    var tabSnapBoxes = document.getElementsByClassName('tab_snap_box');
    for (var i = 0; i < tabSnapBoxes.length; i++) {
      tabSnapBoxes[i].onclick = activateTabSnapshot.bind(null, tabSnapsObj.tabSnaps.listOfSnaps[i]);
    }
  });
}

function hideElement(element) {
  element.style.display = "none";
}

function activateTabSnapshot(tabData) {
  var urls = [];
  for (let tab of tabData.tabs) {
    urls.push(tab.url);
  }
  var createData = {
    url: urls,
    focused: true,
    type: "normal"
  }
  chrome.windows.create(createData, function() {
    console.log("Window created successfully");
  });
  window.close();
}

function getTabsSnapshots(callback) {
  chrome.storage.local.get("tabSnaps", function(tabSnaps) {
    callback(tabSnaps);
  });
}

function createTabHtmlElement(tabData, tabIndex) {
  // TODO: embedding html like this is horrible. Fix.
  var title = tabData.title;
  var url = tabData.url;
  if ("title_highlighted" in tabData) title = tabData.title_highlighted;
  if ("url_highlighted" in tabData) url = tabData.url_highlighted;
  if (tabData.iconUrl === undefined) {
    return "<div class=\"tab\" data-tabnumber=\"" + tabIndex + "\" id=\"search_id_" + tabIndex + "\"><div class=\"text_container\"><div>" + title + "</div><div class=\"url_container\">" + url +"</div></div></div>";
  } else {
    return "<div class=\"tab\" data-tabnumber=\"" + tabIndex + "\" id=\"search_id_" + tabIndex + "\"><img class=\"url_icon\" src=\"" + tabData.iconUrl + "\"><div class=\"text_container\"><div>" + title + "</div><div class=\"url_container\">" + url +"</div></div></div>";
  }
}

function renderSearchResults(tabsToRender) {
  var tabsHtml = "";
  for (let tab of tabsToRender) {
    tabsHtml += tab.html;
  }
  numTabs = tabsToRender.length
  document.getElementById('tab_container').innerHTML = tabsHtml;
}

function makeTabElementsClickable() {
  var tabElements = document.getElementsByClassName('tab');
  var tabIndex;
  for (let tabElement of tabElements) {
    tabIndex = tabElement.getAttribute('data-tabnumber');
    tabElement.onclick = activateTab.bind(null, tabIndex);
    tabElement.addEventListener("mouseover", highlightTabOnHover.bind(null, tabIndex));
    tabIndex++;
  }
}

function searchTabs() {
  var searchText = document.getElementById('search_box').value;

  tabsToRender;
  if (searchText.length === 0) {
    tabsToRender = _searchTabsNoQuery(tabsToSearch);
  } else {
    tabsToRender = _searchTabsWithQuery(tabsToSearch, searchText);
  }

  renderSearchResults(tabsToRender);
  makeTabElementsClickable();
  highlightIndex = 1; // Reset highlight index to the first tab
  if (tabsToRender.length > 0) highlightTab(highlightIndex, true); // highlight first result
}

function _searchTabsNoQuery(tabsToSearch) {
  var tabsToRender = [];
  var tabIndex = 1;
  for (let tab of tabsToSearch) {
    delete tab.title_highlighted;
    delete tab.url_highlighted;
    tab.html = createTabHtmlElement(tab, tabIndex);
    tabsToRender.push(tab);
    tabIndex++;
  }
  return tabsToRender;
}

function _searchTabsWithQuery(tabsToSearch, query) {
  results = fuse.search(query);
  var tabsToRender = [];
  var tabIndex = 1;
  for (let result of results) {
    result.item.matches = result.matches;
    highLightSearchResults(result.item);
    result.item.html = createTabHtmlElement(result.item, tabIndex);
    tabsToRender.push(result.item);
    tabIndex++;
  }
  return tabsToRender;
}

function highLightSearchResults(tab) {
  var matchKey;
  var highLightedText;
  var new_key;
  for (let match of tab.matches) {
    matchKey = match.key;
    highLightedText = _highLightSearchResultsHelper(tab[matchKey], match.indices);
    new_key = matchKey + '_highlighted';
    tab[new_key] = highLightedText;
  }
}

function _highLightSearchResultsHelper(text, matches) {
  var result = [];
  var pair = matches.shift();
  // Build the formatted string
  for (var i = 0; i < text.length; i++) {
    var char = text.charAt(i);
    if (pair && i == pair[0]) {
      result.push('<b>');
    }
    result.push(char);
    if (pair && i == pair[1]) {
      result.push('</b>');
      pair = matches.shift();
    }
  }
  return result.join('');
}

var fuse; // used to perform the fuzzy search
var tabsToSearch = [];
var tabsToRender = [];
var highlightIndex = 1;
var numTabs;
document.addEventListener('DOMContentLoaded', function() {
  // Add event handler to input box
  var inputBox = document.getElementById('search_box');
  inputBox.focus();
  inputBox.oninput = searchTabs;

  var saveSnapMenuElement = document.getElementById('save_snap_menu');
  var showSaveSnapshotMenuButton = document.getElementById('save_snap_button');
  showSaveSnapshotMenuButton.onclick = showSaveSnapshotMenu;

  var submitSaveSnapshotButton = document.getElementById('submit_save_snap_button');
  submitSaveSnapshotButton.onclick = saveSnapshot

  var cancelSaveSnapshotButton = document.getElementById('cancel_save_snap_button');
  cancelSaveSnapshotButton.onclick = hideElement.bind(null, saveSnapMenuElement);

  var renderSnapsListButton = document.getElementById('get_snaps_button');
  renderSnapsListButton.onclick = renderListOfSnapshots;

  getAllTabs(function(tabs) {
    for (let tab of tabs) {
      tabsToSearch.push({
        title: tab.title,
        url: tab.url,
        tabId: tab.id,
        windowId: tab.windowId,
        iconUrl: tab.favIconUrl
      });
    }

    var searchOpts = {
      shouldSort: true,
      keys: ["title", "url"],
      include: ['matches']
    }
    fuse = new Fuse(tabsToSearch, searchOpts);
    searchTabs();
  });
});
