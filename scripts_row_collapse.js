/**
 * Domain-agnostic consecutive-row collapse for table row groups.
 *
 * When N >= minGroupSize consecutive visible rows share the same series key:
 * - keepBoundaryRows true (default): keep first and last, hide N - 2 middle rows
 * - keepBoundaryRows false: hide all rows in the group
 *
 * An expandable placeholder is inserted at the group boundary.
 */

const collapseOptionsByTable = new WeakMap();

function datasetKeyToHtmlAttr(datasetKey) {
    return 'data-' + datasetKey.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function collapseConsecutiveRows(table, options) {
    const {
        rowSelector,
        getSeriesKey,
        isRowVisible,
        createExpandRow,
        collapsedClass,
        expandRowClass,
        groupDataAttr,
        groupIdPrefix = 'collapse-group-',
        minGroupSize = 3,
        keepBoundaryRows = true,
    } = options;

    table.querySelectorAll(`.${expandRowClass}`).forEach((row) => row.remove());
    table.querySelectorAll(`.${collapsedClass}`).forEach((row) => {
        row.classList.remove(collapsedClass);
        delete row.dataset[groupDataAttr];
    });

    const rows = Array.from(table.querySelectorAll(rowSelector))
        .filter((row) => isRowVisible(row));

    let groupIndex = 0;
    let i = 0;

    while (i < rows.length) {
        const seriesKey = getSeriesKey(rows[i]);
        let j = i + 1;
        while (j < rows.length && getSeriesKey(rows[j]) === seriesKey) {
            j++;
        }

        const groupSize = j - i;
        if (groupSize >= minGroupSize) {
            const groupId = `${groupIdPrefix}${groupIndex++}`;
            const firstRow = rows[i];
            const lastRow = rows[j - 1];
            const hiddenCount = keepBoundaryRows ? groupSize - 2 : groupSize;
            const expandRow = createExpandRow({
                groupId,
                hiddenCount,
                seriesKey: getSeriesKey(firstRow),
                firstRow,
                lastRow,
            });

            if (keepBoundaryRows) {
                firstRow.dataset[groupDataAttr] = groupId;
                lastRow.dataset[groupDataAttr] = groupId;

                for (let k = i + 1; k < j - 1; k++) {
                    rows[k].classList.add(collapsedClass);
                    rows[k].dataset[groupDataAttr] = groupId;
                }

                firstRow.after(expandRow);
            } else {
                for (let k = i; k < j; k++) {
                    rows[k].classList.add(collapsedClass);
                    rows[k].dataset[groupDataAttr] = groupId;
                }

                firstRow.before(expandRow);
            }
        }

        i = j;
    }
}

function handleConsecutiveRowExpandClick(event) {
    const table = event.target.closest('table');
    if (!table) {
        return;
    }

    const options = collapseOptionsByTable.get(table);
    if (!options) {
        return;
    }

    const button = event.target.closest(options.expandLinkSelector);
    if (!button) {
        return;
    }

    const groupId = button.dataset[options.groupDataAttr];
    if (!groupId) {
        return;
    }

    const { collapsedClass, expandRowClass, groupDataAttr } = options;
    const groupAttr = datasetKeyToHtmlAttr(groupDataAttr);
    const escapedGroupId = typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(groupId)
        : groupId.replace(/"/g, '\\"');

    table.querySelectorAll(`[${groupAttr}="${escapedGroupId}"].${collapsedClass}`)
        .forEach((row) => {
            row.classList.remove(collapsedClass);
            delete row.dataset[groupDataAttr];
        });

    table.querySelectorAll(`.${expandRowClass}[${groupAttr}="${escapedGroupId}"]`)
        .forEach((row) => row.remove());

    table.querySelectorAll(`[${groupAttr}="${escapedGroupId}"]`)
        .forEach((row) => delete row.dataset[groupDataAttr]);
}

function initConsecutiveRowCollapse(table, options) {
    collapseOptionsByTable.set(table, options);

    const boundKey = options.boundDataAttr || 'rowCollapseBound';
    if (table.dataset[boundKey]) {
        return;
    }

    table.dataset[boundKey] = '1';
    table.addEventListener('click', handleConsecutiveRowExpandClick);
}

function refreshConsecutiveRowCollapse(options) {
    const table = document.querySelector(options.tableSelector);
    if (table) {
        collapseConsecutiveRows(table, options);
    }
}
