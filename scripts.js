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
                    "professional": "careerCheckbox",
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

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') {
        return { r: 108, g: 117, b: 125 };
    }
    let h = hex.trim().replace('#', '');
    if (h.length === 3) {
        h = h.split('').map((c) => c + c).join('');
    }
    if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
        return { r: 108, g: 117, b: 125 };
    }
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}

function clearCardActionAccent(el) {
    el.style.removeProperty('background');
    el.style.removeProperty('border-color');
    el.style.removeProperty('box-shadow');
    el.style.removeProperty('color');
    const iconWrap = el.querySelector('.card-action-icon');
    if (iconWrap) {
        iconWrap.style.removeProperty('color');
    }
}

/** Tinted background/border from icon rule color (mobile card tiles only). */
function applyCardActionAccent(el, accentHex, isShareButton) {

    if (!window.matchMedia('(max-width: 600px)').matches) {
        clearCardActionAccent(el);
        return;
    }

    const { r, g, b } = hexToRgb(accentHex);
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    if (isShareButton) {
        const rT = clamp(r * 1.12);
        const gT = clamp(g * 1.12);
        const bT = clamp(b * 1.12);
        const rD = clamp(r * 0.82);
        const gD = clamp(g * 0.82);
        const bD = clamp(b * 0.82);
        el.style.setProperty(
            'background',
            `linear-gradient(180deg, rgb(${rT},${gT},${bT}) 0%, rgb(${r},${g},${b}) 42%, rgb(${rD},${gD},${bD}) 100%)`,
            'important'
        );
        el.style.setProperty('border-color', hexToRgba(accentHex, 0.45), 'important');
        el.style.setProperty('box-shadow', `0 2px 10px ${hexToRgba(accentHex, 0.35)}`, 'important');
    } else {
        el.style.background = `radial-gradient(circle at center, ${hexToRgba(accentHex, 0.22)} 0%, ${hexToRgba(accentHex, 0.11)} 52%, ${hexToRgba(accentHex, 0.05)} 100%)`;
        el.style.borderColor = hexToRgba(accentHex, 0.28);
        el.style.color = accentHex;
        const iconWrap = el.querySelector('.card-action-icon');
        if (iconWrap) {
            iconWrap.style.color = 'inherit';
        }
    }
}

function refreshAllCardActionAccents() {
    document.querySelectorAll('.auto-card-actions[data-card-actions-ready="true"]').forEach(block => {
        Array.from(block.querySelectorAll('a, button')).forEach(el => {
            const accentHex = el.dataset.accent;
            if (accentHex) {
                applyCardActionAccent(el, accentHex, el.classList.contains('share-button'));
            }
        });
    });
}

window.matchMedia('(max-width: 600px)').addEventListener('change', refreshAllCardActionAccents);

function initializeCardActions() {
    const actionBlocks = document.querySelectorAll('.auto-card-actions');

    const iconRules = [
        { keyword: 'code', icon: 'fa-code', color: '#24292f' },           /* GitHub ink */
        { keyword: 'paper', icon: 'fa-file-text-o', color: '#1565c0' },   /* scholarly blue */
        { keyword: 'twitter', icon: 'fa-twitter', color: '#1d9bf0' },    /* X / Twitter */
        { keyword: 'certificate', icon: 'fa-certificate', color: '#b8860b' },
        { keyword: 'poster', icon: 'fa-file-image-o', color: '#6b4fbb' },
        { keyword: 'proceedings', icon: 'fa-book', color: '#5d4037' },    /* book / volume; matches FA style */
        { keyword: 'model', icon: 'fa-cube', color: '#ff9d00' },         /* Hugging Face–style orange */
        { keyword: 'colab', icon: 'fa-book', color: '#F9AB00' },         /* Google Colab–style amber */
        { keyword: 'notebook', icon: 'fa-book', color: '#F9AB00' },
        { keyword: 'watch', icon: 'fa-play-circle', color: '#ff0000' },  /* YouTube red */
        { keyword: 'share', icon: 'fa-share-alt', color: '#4DAAF5' },    /* matches .share-button */
    ];
    const defaultLinkIconColor = '#6c757d';

    actionBlocks.forEach(block => {
        if (block.dataset.cardActionsReady === 'true') {
            return;
        }

        block.classList.add('card-actions');

        // Remove slash separators from the original inline markup.
        Array.from(block.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '/') {
                node.remove();
            }
        });

        const actionElements = Array.from(block.querySelectorAll('a, button'));

        actionElements.forEach((el, idx) => {
            const isButton = el.tagName.toLowerCase() === 'button';
            el.classList.add(isButton ? 'card-action-button' : 'card-action-link');

            if (!el.querySelector('.card-action-icon')) {

                const normalizedText = el.textContent
                    .trim()
                    .toLowerCase()
                    .replace(/\p{Extended_Pictographic}/gu, '')
                    .replace(/^[^\p{L}\p{N}]+/gu, '')
                    .replace(/\s*\([^)]*\)\s*/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                const text = normalizedText.includes('watch') ? 'watch' : normalizedText;

                const matched = iconRules.find(rule => text.includes(rule.keyword));

                el.textContent = text;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'card-action-icon';

                const accentColor = matched ? matched.color : defaultLinkIconColor;

                if (matched) {
                    iconSpan.innerHTML = `<i class="fa ${matched.icon}" aria-hidden="true"></i>`;
                    iconSpan.style.color = matched.color;
                } else {
                    iconSpan.innerHTML = '<i class="fa fa-external-link" aria-hidden="true"></i>';
                    iconSpan.style.color = defaultLinkIconColor;
                }

                el.appendChild(document.createTextNode(' '));
                el.appendChild(iconSpan);

                el.dataset.accent = accentColor;
            }

            if (idx < actionElements.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'card-action-sep';
                sep.textContent = ' / ';
                el.insertAdjacentElement('afterend', sep);
            }
        });

        block.dataset.cardActionsReady = 'true';
    });

    refreshAllCardActionAccents();
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
initializeCardActions();
