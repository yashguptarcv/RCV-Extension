// Use MutationObserver to handle dynamic content loading
const observer = new MutationObserver(function(mutations) {
  checkAndApplyDefaultFilter();
});

// Start observing the document with the configured parameters
observer.observe(document.body, { 
  childList: true, 
  subtree: true,
  attributes: false,
  characterData: false
});

// Function to check and apply default filter
function checkAndApplyDefaultFilter() {
  chrome.storage.sync.get(['defaultFilter'], function(data) {
    if (data.defaultFilter && document.querySelector('a.task')) {
      // Stop observing once we've found tasks
      observer.disconnect();
      applyFilter(data.defaultFilter);
    }
  });
}

// Apply filter function with improved selectors
function applyFilter(filterName) {
  const tasks = document.querySelectorAll('a.task');
  let anyVisible = false;

  tasks.forEach(task => {
    const nameElement = task.querySelector('.flex.items-center.w-full.mt-1.text-xs.font-medium.text-gray-400 p');
    if (nameElement) {
      const name = nameElement.textContent.trim();
      
      if (name === filterName) {
        task.style.display = 'block';
        anyVisible = true;
        
        // Make sure parent containers are visible
        let parent = task.closest('.swim-lane');
        while (parent) {
          parent.style.display = 'block';
          parent = parent.parentElement.closest('.swim-lane');
        }
      } else {
        task.style.display = 'none';
      }
    }
  });

  // If no tasks matched, show message
  if (!anyVisible) {
    showNoTasksMessage(filterName);
  }
}

// Clear filter function
function clearFilter() {
  const tasks = document.querySelectorAll('a.task');
  tasks.forEach(task => {
    task.style.display = 'block';
  });
  
  const swimLanes = document.querySelectorAll('.swim-lane');
  swimLanes.forEach(lane => {
    lane.style.display = 'block';
  });
  
  removeNoTasksMessage();
}

// Helper function to show message when no tasks match
function showNoTasksMessage(filterName) {
  removeNoTasksMessage();
  
  const message = document.createElement('div');
  message.id = 'filter-no-tasks-message';
  message.style.padding = '10px';
  message.style.backgroundColor = '#f8d7da';
  message.style.color = '#721c24';
  message.style.border = '1px solid #f5c6cb';
  message.style.borderRadius = '4px';
  message.style.margin = '10px';
  message.style.textAlign = 'center';
  message.textContent = `No tasks found for filter: ${filterName}`;
  
  document.body.prepend(message);
}

function removeNoTasksMessage() {
  const existingMessage = document.getElementById('filter-no-tasks-message');
  if (existingMessage) {
    existingMessage.remove();
  }
}

// Initial check when content script loads
checkAndApplyDefaultFilter();

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "applyFilter") {
    applyFilter(request.filterName);
  } else if (request.action === "clearFilter") {
    clearFilter();
  }
});