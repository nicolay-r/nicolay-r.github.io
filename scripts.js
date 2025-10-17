function getFilterCheckboxes() {
    return Array.from(document.querySelectorAll('.filter-checkbox'));
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

            // Update the URL with the selected tab
            if (window.history && window.history.pushState) {
                let currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('tab', selectedTab);
                window.history.pushState({ state: "test" }, "", currentUrl.href);
            }

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

                    // if URI has `data-type` then check  only the related checkbox
                    const url = new URL(window.location.href);

                    // Default checkbox to check.
                    let cbId = "paperCheckbox";

                    if (url.searchParams.has('data_type')) {
                        const data_type = url.searchParams.get('data_type');
                        cbId = `${data_type}Checkbox`;
                    }

                    checkSingle(checkboxes, cbToCheck = checkboxes.find(cb => cb.id === cbId));
                    applyFilterTable(states = getCheckboxCheckedStates(checkboxes));
                }
                
                // If switching to NEWS tab, load news content
                if (selectedTab === 'news') {
                    loadNewsContent();
                }
            }
        });
    });

    // Setup the initial tab.
    const currentUrl = new URL(window.location.href);
    const tabName =currentUrl.searchParams.get('tab');
    if (tabName) {
        const tabIndex = Array.from(tabHeaders).findIndex(header => header.getAttribute('data-tab') === tabName);
        tabHeaders[tabIndex].click();
    }
    else {
        tabHeaders[0].click();
    }
}

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
    html += '<tbody>';
    
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
        let dateCellClass = 'news-date-cell';
        let contentCellClass = 'news-content-cell';
        
        // Apply slight gray background to first 5 entries
        if (rowCount < 5) {
            rowClass += ' news-highlight-row';
        }

        // Parse date and content from the line
        const { date, content } = parseNewsLine(line);

        // Create a table row with two columns
        html += `<tr class="${rowClass}">`;
        html += `<td class="${dateCellClass}">${date}</td>`;
        html += `<td class="${contentCellClass}">${formatMarkdown(content)}</td>`;
        html += '</tr>';
        
        rowCount++;
    }
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    return html;
}

function parseNewsLine(line) {
    // Remove initial asterisk and whitespace
    let content = line.replace(/^\s*\*\s*/, '');
    
    // Regular expression to match **DD/MM/YYYY:** format at the beginning
    const dateRegex = /^(\*\*\d{2}\/\d{2}\/\d{4}:\*\*)\s+(.*)$/;
    const match = content.match(dateRegex);
    
    if (match) {
        const dateString = match[1].replace('**', '').replace(':**', ''); // DD/MM/YYYY
        return {
            date: formatRelativeTime(dateString), // Convert to relative time
            content: match[2] // rest of the content
        };
    } else {
        // If no date found, return empty date and full content
        return {
            date: '',
            content: content
        };
    }
}

function formatRelativeTime(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const now = new Date();
    
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSeconds < 60) {
        return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffWeeks < 4) {
        return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
        return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    } else {
        return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    }
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
    const tbody = row.closest('tbody');

    const dataType = tbody ? tbody.getAttribute('data-type') : null;

    // Modify URL.
    let currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('data_type', dataType);
    currentUrl.hash = row.id;
    const fullUrl = currentUrl.href;
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


initializeTabRibbon();
