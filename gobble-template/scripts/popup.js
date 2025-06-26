(function () {
  let editIndex = null; // To track which template is being edited

  document.getElementById('templateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('templateTitle').value.trim();
    const content = document.getElementById('templateContent').value.trim();

    if (!title || !content) return;

    chrome.storage.local.get({ templates: [] }, (data) => {
      const templates = data.templates;

      if (editIndex !== null) {
        // Update existing template
        templates[editIndex] = { title, content };
        editIndex = null;
      } else {
        // Add new template
        templates.push({ title, content });
      }

      chrome.storage.local.set({ templates }, () => {
        document.getElementById('templateForm').reset();
        loadTemplates();
      });
    });
  });

  async function loadTemplates() {
    chrome.storage.local.get({ templates: [], remoteConfig: {} }, async (data) => {
      const list = document.getElementById('templateList');
      list.innerHTML = '';
      let templates = data.templates;
      
      // try {
      //   // Step 1: Fetch API templates
      //   const response = await fetch(data.remoteConfig.fetch_templates, {
      //       method: 'GET',
      //       headers: {
      //           'Authorization': `Bearer ${data.remoteConfig.api_token}`, // or any other token format
      //           'Content-Type': 'application/json'
      //       }
      //   });
      //   const apiTemplates = await response.json(); // Assume it's an array of { title, content }
  
      //   // Step 2: Merge API and local templates
      //   templates = [...data.templates];

      //   if (apiTemplates.success) {
      //       templates = [...templates, ...apiTemplates.templates];
      //   }
       
      // } catch (error) {
      //   console.error("Failed to fetch API templates:", error);
      // }

       if (!templates.length) {
          list.innerHTML = '<li class="list-group-item text-muted">No templates saved.</li>';
          return;
        }

       templates.forEach((tpl, index) => {
          const li = document.createElement('li');
          li.className = 'list-group-item d-flex justify-content-between align-items-start flex-column';
  
          const contentDiv = document.createElement('div');
          contentDiv.className = 'w-100';
          contentDiv.innerHTML = `<strong>${tpl.title}</strong><br>`;
          li.appendChild(contentDiv);
  
          const btnGroup = document.createElement('div');
          btnGroup.className = 'template-buttons mt-2 d-flex gap-2';
  
          // Only show edit/delete buttons for local templates
          if (index < data.templates.length) {
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-template btn-edit';
            editBtn.addEventListener('click', () => {
              document.getElementById('templateTitle').value = tpl.title;
              document.getElementById('templateContent').value = tpl.content;
              editIndex = index;
            });
  
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn-template btn-delete';
            deleteBtn.addEventListener('click', () => {
              const updated = data.templates.filter((_, i) => i !== index);
              chrome.storage.local.set({ templates: updated }, loadTemplates);
            });
  
            btnGroup.appendChild(editBtn);
            btnGroup.appendChild(deleteBtn);
          } else {
            // show not editable
            btnGroup.innerHTML = `<button class="btn-template btn-copy" data-index="${index}">Not editable</button>`;
          }
  
          li.appendChild(btnGroup);
          list.appendChild(li);
        });
    });
  }  

  document.addEventListener('DOMContentLoaded', loadTemplates);
})();
