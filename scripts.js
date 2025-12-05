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

                }
                
                // If switching to NEWS tab, load news content
                if (selectedTab === 'news') {
                    loadNewsContent();
                    return;
                }
                
                default_tab = {
                    "professional": "paperCheckbox",
                    "athletics": "5KCheckbox",
                }
                
                // If switching to ATHLETICS tab, load athletics content
                if (selectedTab === 'athletics') {
                    loadAthleticsContent();
                }

                var checkboxes = getFilterCheckboxes();

                // if URI has `data-type` then check  only the related checkbox
                const url = new URL(window.location.href);

                // Default checkbox to check.
                let cbId = default_tab[selectedTab];

                if (url.searchParams.has('data_type')) {
                    const data_type = url.searchParams.get('data_type');
                    cbId = `${data_type}Checkbox`;
                }

                checkSingle(checkboxes, cbToCheck = checkboxes.find(cb => cb.id === cbId));
                applyFilterTable(states = getCheckboxCheckedStates(checkboxes));
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

function loadAthleticsContent() {
    const athleticsContainer = document.getElementById('athletics-container');
    
    if (!athleticsContainer.innerHTML.includes('Athletics content coming soon...')) {
        return; // Content already loaded
    }
    
    // For now, just show a placeholder message
    athleticsContainer.innerHTML = `
        <div style="text-align: center;">
            <div style="background-color: #f8f9fa; padding: 10px; max-width: 600px; margin: 0 auto;">
                <a href="https://nicolay-r.github.io/run/"><b>🏃 athletics-profile</b></a>
            </div>
        </div>
    `;
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

function getDateColor(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    const now = new Date();
    
    // Calculate days difference (positive for past dates, negative for future)
    const diffMs = now - date;
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    
    // If future date, use blue
    if (diffMs < 0) {
        return '#007bff'; // Blue for upcoming events
    }
    
    // If older than 1 year (365 days), use gray
    if (diffDays >= 365) {
        return '#6c757d'; // Gray for old news
    }
    
    // Calculate color gradient from green to gray
    // Interpolate between bright green (#28a745) and gray (#6c757d)
    // Based on how close to 365 days we are
    const ratio = diffDays / 365; // 0 = recent, 1 = 1 year old
    
    // Bright green RGB: (40, 167, 69)
    // Gray RGB: (108, 117, 125)
    const r1 = 40, g1 = 167, b1 = 69;  // Green
    const r2 = 108, g2 = 117, b2 = 125; // Gray
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
}

function parseNewsLine(line) {
    // Remove initial asterisk and whitespace
    let content = line.replace(/^\s*\*\s*/, '');
    
    // Regular expression to match **DD/MM/YYYY:** format at the beginning
    const dateRegex = /^(\*\*\d{2}\/\d{2}\/\d{4}:\*\*)\s+(.*)$/;
    const match = content.match(dateRegex);
    
    if (match) {
        const dateString = match[1].replace('**', '').replace(':**', ''); // DD/MM/YYYY
        const relativeTime = formatRelativeTime(dateString);
        const formattedDate = formatDate(dateString);
        const dateColor = getDateColor(dateString);
        
        return {
            date: `<span style="color: ${dateColor};">${relativeTime}<br><small>${formattedDate}</small></span>`,
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
    
    const diffMs = date - now; // Changed: date - now to handle future dates
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    const isFuture = diffMs > 0;
    const prefix = isFuture ? 'in ' : '';
    const suffix = isFuture ? '' : ' ago';
    
    if (diffSeconds < 60) {
        return `${prefix}${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}${suffix}`;
    } else if (diffMinutes < 60) {
        return `${prefix}${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}${suffix}`;
    } else if (diffHours < 24) {
        return `${prefix}${diffHours} hour${diffHours !== 1 ? 's' : ''}${suffix}`;
    } else if (diffDays < 7) {
        return `${prefix}${diffDays} day${diffDays !== 1 ? 's' : ''}${suffix}`;
    } else if (diffWeeks < 4) {
        return `${prefix}${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}${suffix}`;
    } else if (diffMonths < 12) {
        return `${prefix}${diffMonths} month${diffMonths !== 1 ? 's' : ''}${suffix}`;
    } else {
        return `${prefix}${diffYears} year${diffYears !== 1 ? 's' : ''}${suffix}`;
    }
}

function formatDate(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    
    // Format as "DD MMM YYYY" (e.g., "15 Mar 2024")
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${day} ${monthNames[month - 1]} ${year}`;
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
