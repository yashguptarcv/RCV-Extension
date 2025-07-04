document.addEventListener('DOMContentLoaded', function() {
  const filterNameInput = document.getElementById('filterName');
  const addFilterBtn = document.getElementById('addFilter');
  const filterList = document.getElementById('filterList');
  const setDefaultBtn = document.getElementById('setDefault');
  const deleteFilterBtn = document.getElementById('deleteFilter');
  const currentFilterDisplay = document.getElementById('currentFilter');
  const applyFilterBtn = document.getElementById('applyFilter');
  const clearFilterBtn = document.getElementById('clearFilter');

  let filters = [];
  let defaultFilter = null;
  let currentFilter = null;

  // Load saved data
  chrome.storage.sync.get(['filters', 'defaultFilter'], function(data) {
    if (data.filters) {
      filters = data.filters;
      updateFilterList();
    }
    if (data.defaultFilter) {
      defaultFilter = data.defaultFilter;
      currentFilterDisplay.textContent = `Current Filter: ${defaultFilter} (Default)`;
    }
  });

  // Add new filter
  addFilterBtn.addEventListener('click', function() {
    const filterName = filterNameInput.value.trim();
    if (filterName && !filters.includes(filterName)) {
      filters.push(filterName);
      chrome.storage.sync.set({ filters: filters });
      updateFilterList();
      filterNameInput.value = '';
    }
  });

  // Set default filter
  setDefaultBtn.addEventListener('click', function() {
    const selectedFilter = filterList.value;
    if (selectedFilter) {
      defaultFilter = selectedFilter;
      chrome.storage.sync.set({ defaultFilter: defaultFilter });
      currentFilterDisplay.textContent = `Current Filter: ${defaultFilter} (Default)`;
    }
  });

  // Apply filter
  applyFilterBtn.addEventListener('click', function() {
    const selectedFilter = filterList.value;
    if (selectedFilter) {
      currentFilter = selectedFilter;
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: "applyFilter", 
          filterName: selectedFilter 
        });
      });
      currentFilterDisplay.textContent = `Current Filter: ${selectedFilter}`;
    }
  });

  // Delete filter
  deleteFilterBtn.addEventListener('click', function() {
    const selectedFilter = filterList.value;
    if (selectedFilter) {
      // Remove from filters array
      filters = filters.filter(f => f !== selectedFilter);
      
      // Clear default if it was the deleted one
      if (defaultFilter === selectedFilter) {
        defaultFilter = null;
        chrome.storage.sync.set({ defaultFilter: null });
      }
      
      saveFilters();
      updateFilterList();
      
      // Clear current filter display if it was the deleted one
      if (currentFilter === selectedFilter) {
        currentFilter = null;
        currentFilterDisplay.textContent = "Current Filter: None";
      }
    }
  });

   // Save filters to storage
  function saveFilters() {
    chrome.storage.sync.set({ filters: filters });
  }

  // Clear filter
  clearFilterBtn.addEventListener('click', function() {
    currentFilter = null;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "clearFilter" });
    });
    currentFilterDisplay.textContent = "Current Filter: None";
  });

  // Update filter list dropdown
  function updateFilterList() {
    filterList.innerHTML = '';
    filters.forEach(filter => {
      const option = document.createElement('option');
      option.value = filter;
      option.textContent = filter;
      filterList.appendChild(option);
    });
  }
});