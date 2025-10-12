function getFilterCheckboxes() {
    return document.querySelectorAll('.filter-checkbox');
}

function checkSingle(checkboxes, cbToCheck) {
    checkboxes.forEach(cb => { cb.checked = cb === cbToCheck; });
}

function checkSingleOrAll(checkboxes, states, cbToCheck) {
    const allUnchecked = Object.values(states).every(value => !value);
    if (allUnchecked) {
        // Make all of them checked.
        checkboxes.forEach(cb => { cb.checked = true; });
    }
    else {
        checkSingle(checkboxes, cbToCheck);
    }
}

function getCheckboxCheckedStates(checkboxes) {
    const states = {};
    checkboxes.forEach(cb => {
        const data_type = cb.id.replace('Checkbox', '');
        states[data_type] = cb.checked;
    });

    return states;
}

function applyFilterTable(checkboxStates) {
    const rowsWithDataType = document.querySelectorAll('[data-type]');
    rowsWithDataType.forEach(function(row) {
        row.style.display = checkboxStates[row.dataset.type] ? '' : 'none';
    });
}

function initializerTableFilters() {
    var checkboxes = getFilterCheckboxes();

    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            ///////////////////////////////////////////////////////////////////////
            // Checkbox states changing logic.
            ///////////////////////////////////////////////////////////////////////
            const checkboxStates = getCheckboxCheckedStates(checkboxes);
            checkSingleOrAll(checkboxes, checkboxStates, cbToCheck = this);

            ///////////////////////////////////////////////////////////////////////
            // Filtering.
            ///////////////////////////////////////////////////////////////////////
            const checkedStates = getCheckboxCheckedStates(checkboxes);
            applyFilterTable(checkedStates);
        });
    });
}
initializerTableFilters();

function initializeTabRibbon() {
    const tabHeaders = document.querySelectorAll('.tab-header');
    
    tabHeaders.forEach(function(header) {
        header.addEventListener('click', function() {
            // Remove active class from all tab headers
            tabHeaders.forEach(h => h.classList.remove('active'));
            
            // Add active class to clicked tab header
            this.classList.add('active');
            
            // Get the tab type from data-tab attribute
            const selectedTab = this.getAttribute('data-tab');
            
            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // Show the selected tab content
            const selectedContent = document.getElementById(selectedTab + '-content');
            if (selectedContent) {
                selectedContent.style.display = 'block';
                
                // If switching to PROFESSIONAL tab, reinitialize the filter logic
                if (selectedTab === 'professional') {
                    var checkboxes = getFilterCheckboxes();
                    const checkedStates = getCheckboxCheckedStates(checkboxes);
                    applyFilterTable(checkedStates);
                }
                
                // If switching to NEWS tab, load news content
                if (selectedTab === 'news') {
                    loadNewsContent();
                }
            }
        });
    });
    
    // Initialize with the first tab (PROFESSIONAL) active
    if (tabHeaders.length > 0) {
        tabHeaders[0].click();
    }
}
initializeTabRibbon();

function loadNewsContent() {
    const newsContainer = document.getElementById('news-container');
    
    if (!newsContainer.innerHTML.includes('Loading news content...')) {
        return; // Content already loaded
    }
    
    fetch('https://raw.githubusercontent.com/nicolay-r/nicolay-r/refs/heads/master/README.md')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load news content');
            }
            return response.text();
        })
        .then(text => {
            // Parse the text content and format it as HTML
            const formattedContent = formatNewsContent(text);
            newsContainer.innerHTML = formattedContent;
        })
        .catch(error => {
            console.error('Error loading news content:', error);
            newsContainer.innerHTML = '<p align="center" style="color: #dc3545; font-style: italic;">Error loading news content. Please try again later.</p>';
        });
}

function formatNewsContent(text) {
    const lines = text.split('\n');
    let html = '<div class="news-content">';
    html += '<table class="news-table">';
    
    // Find the starting line with "### The most recent"
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().includes('### The most recent')) {
            startIndex = i+1;
            break;
        }
    }
    
    // If not found, start from beginning
    if (startIndex === -1) {
        startIndex = 0;
    }
    
    let rowCount = 0;
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (line === '') {
            continue;
        }
        
        // Skip lines that don't start with asterisk
        if (!line.startsWith('*')) {
            continue;
        }

        let rowClass = 'news-row';
        let cellClass = 'news-cell';
        
        // Apply slight gray background to first 5 entries
        if (rowCount < 5) {
            rowClass += ' news-highlight-row';
        }

        // Create a table row for each non-empty line
        html += `<tr class="${rowClass}">`;
        html += `<td class="${cellClass}">${formatMarkdown(line)}</td>`;
        html += '</tr>';
        
        rowCount++;
    }
    
    html += '</table>';
    html += '</div>';
    return html;
}

function formatMarkdown(text) {
    // Remove initial asterisk from bullet list items
    text = text.replace(/^\s*\*\s*/, '');
    
    // Convert markdown bold syntax to HTML
    // Handle **text** and __text__ patterns
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Convert markdown italic syntax to HTML
    // Handle *text* and _text_ patterns (but not if they're part of bold)
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
    
    // Convert markdown links [text](url) to HTML
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return text;
}

function shareRow(event) {
    const button = event.target;

    const row = button.closest('tr');

    const rowId = row.id;

    let currentUrl = window.location.href.split('#')[0];
    const fullUrl = `${currentUrl}#${rowId}`;
    const shareText = `${fullUrl}`;

    // Adopt WebShare API.
    if (navigator.share) {
        navigator.share({
            title: 'Share this item',
            url: fullUrl,
        }).then(() => {
            console.log('Successfully shared');
        }).catch((error) => {
            console.error('Error sharing:', error);
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl)
        .then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = fullUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
          document.execCommand('copy');
          alert('Link copied to clipboard!');
        } catch (err) {
          alert('Copy this link: ' + fullUrl);
        }
        document.body.removeChild(tempInput);
    }
}


// Initial setup.
checkboxes = getFilterCheckboxes();
checkSingle(checkboxes, cbToCheck = Array.from(checkboxes).filter(cb => cb.id === "paperCheckbox")[0]);
applyFilterTable(states = getCheckboxCheckedStates(checkboxes));