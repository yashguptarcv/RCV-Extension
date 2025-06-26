(function ($) {

    const domainMatch = window.location.hostname.indexOf("roilift.gobblecrm.com") !== -1;
    if (!domainMatch) return;

    const textareaSelector = "div.ck.ck-content.ck-editor__editable.ck-rounded-corners.ck-editor__editable_inline.ck-blurred";
    const selector = "div.flex.justify-end.mt-2";

    const fillText = () => {
        chrome.storage.local.get({ templates: [], remoteConfig: {} }, async (data) => {
            let templates = data.templates;
            
            // try {
            //     const response = await fetch(data.remoteConfig.fetch_templates, {
            //         method: 'GET',
            //         headers: {
            //             'Authorization': `Bearer ${data.remoteConfig.api_token}`, // or any other token format
            //             'Content-Type': 'application/json'
            //         }
            //     });
            //     const apiTemplates = await response.json();

            //     templates = [...data.templates];

            //     if (apiTemplates.success) {
            //         templates = [...templates, ...apiTemplates.templates];
            //     }
            // } catch (error) {
            //     console.error("Failed to fetch API templates:", error);
            // }

            // console.log("Templates:", templates);

            const $parentDiv = $(selector);
            
            if ($parentDiv.length > 0) {
                const parentDiv = $parentDiv[0];

                if (parentDiv.querySelector('.mail-template-dropdown-container')) return;

                const container = document.createElement('div');
                container.className = "mb-2 mail-template-dropdown-container";

                const dropdown = document.createElement('select');
                dropdown.className = "form-select w-full p-2 border border-gray-300 rounded-lg ring-0 focus:outline-none focus:!border-pink-500 focus:!ring-1 focus:!ring-pink-500 sm:text-sm btn";

                const defaultOpt = document.createElement("option");
                defaultOpt.text = "-- Saved Templates --";
                dropdown.appendChild(defaultOpt);

                templates.forEach(tpl => {
                    const option = document.createElement("option");
                    option.value = tpl.content;
                    option.text = tpl.title;
                    dropdown.appendChild(option);
                });

                dropdown.addEventListener("change", (e) => {
                    const $textareaMessage = $(textareaSelector);
                    if ($textareaMessage.length > 0) {
                        if (e.target.value != '-- Saved Templates --') {
                            
                            $textareaMessage.html(e.target.value.replace(/\n/g, "<br>"));
                        } else {
                            $textareaMessage.html('');
                        }
                        $textareaMessage.focus();
                        $textareaMessage.blur();
                    }
                });

                parentDiv.appendChild(container);
                container.appendChild(dropdown);
            }
        });
    };

    // Observe mutations on the body
    const observer = new MutationObserver(() => {
        const $target = $(selector);
        if ($target.length && !$target[0].querySelector('.mail-template-dropdown-container')) {
            fillText();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Run initially in case DOM is already loaded
    $(document).ready(() => {
        fillText();
    });

})(jQuery);
