const { Markup } = require('telegraf');

function getMarkupButtons(buttons, columns = false) {
    if (columns === true) {
        columns = 1;
    }

    let getMarkupButton = button => {
        if (button.url) {
            return Markup.button.url(button.text, button.url);
        }
        else {
            return Markup.button.callback(button.text, button.code);
        }
    }

    let markupButtons = buttons.map(button => {
        if (button instanceof Array) {
            return button.map(getMarkupButton)
        }

        return getMarkupButton(button);
    });

    let columnButtons = [];
    if (columns > 0) {
        let row = [];
        for (const button of markupButtons) {

            if (row.length === columns) {
                columnButtons.push(row);
                row = [];
            }

            row.push(button);
        }

        if (row.length > 0) {
            columnButtons.push(row);
        }
    }
    else {
        columnButtons = markupButtons;
    }

    return columnButtons;
}

module.exports = function (buttons, columns = false, oneTime = false) {
    let columnButtons = getMarkupButtons(buttons, columns);
    let keyboard = Markup.inlineKeyboard(columnButtons);

    if (oneTime) {
        keyboard = keyboard.oneTime(true);
    }

    return keyboard;
}
