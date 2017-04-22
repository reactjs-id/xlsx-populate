"use strict";

const proxyquire = require("proxyquire");

describe("Cell", () => {
    let Cell, cell, cellNode, row, sheet, workbook, sharedStrings, styleSheet, style, FormulaError;

    beforeEach(() => {
        FormulaError = jasmine.createSpyObj("FormulaError", ["getError"]);
        FormulaError.getError.and.returnValue("ERROR");

        Cell = proxyquire("../../lib/Cell", {
            './FormulaError': FormulaError,
            '@noCallThru': true
        });

        style = jasmine.createSpyObj("style", ["style", "id"]);
        style.id.and.returnValue(4);
        style.style.and.callFake(name => `STYLE:${name}`);

        styleSheet = jasmine.createSpyObj("styleSheet", ["createStyle"]);
        styleSheet.createStyle.and.returnValue(style);

        sharedStrings = jasmine.createSpyObj("sharedStrings", ['getIndexForString', 'getStringByIndex']);
        sharedStrings.getIndexForString.and.returnValue(7);
        sharedStrings.getStringByIndex.and.returnValue("STRING");

        workbook = jasmine.createSpyObj("workbook", ["sharedStrings", "styleSheet"]);
        workbook.sharedStrings.and.returnValue(sharedStrings);
        workbook.styleSheet.and.returnValue(styleSheet);

        sheet = jasmine.createSpyObj('sheet', ['createStyle', 'activeCell', 'updateMaxSharedFormulaId', 'name', 'column', 'clearCellsUsingSharedFormula', 'cell', 'range', 'hyperlink']);
        sheet.activeCell.and.returnValue("ACTIVE CELL");
        sheet.name.and.returnValue("NAME");
        sheet.column.and.returnValue("COLUMN");
        sheet.hyperlink.and.returnValue("HYPERLINK");
        sheet.range.and.returnValue("RANGE");

        row = jasmine.createSpyObj('row', ['sheet', 'workbook', 'rowNumber']);
        row.sheet.and.returnValue(sheet);
        row.workbook.and.returnValue(workbook);
        row.rowNumber.and.returnValue(7);

        cellNode = {
            name: 'c',
            attributes: {
                r: "C7"
            },
            children: []
        };

        cell = new Cell(row, cellNode);
    });

    /* PUBLIC */

    describe("active", () => {
        it("should return true/false", () => {
            expect(cell.active()).toBe(false);
            sheet.activeCell.and.returnValue(cell);
            expect(cell.active()).toBe(true);
        });

        it("should set the sheet active cell", () => {
            expect(cell.active(true)).toBe(cell);
            expect(sheet.activeCell).toHaveBeenCalledWith(cell);
        });

        it("should throw an error if attempting to deactivate", () => {
            expect(() => cell.active(false)).toThrow();
        });
    });

    describe("address", () => {
        it("should return the address", () => {
            spyOn(cell, "rowNumber").and.returnValue(7);
            spyOn(cell, "columnNumber").and.returnValue(3);

            expect(cell.address()).toBe('C7');
            expect(cell.address({ rowAnchored: true })).toBe('C$7');
            expect(cell.address({ columnAnchored: true })).toBe('$C7');
            expect(cell.address({ includeSheetName: true })).toBe("'NAME'!C7");
            expect(cell.address({ includeSheetName: true, rowAnchored: true, columnAnchored: true })).toBe("'NAME'!$C$7");
            expect(cell.address({ anchored: true })).toBe("$C$7");
        });
    });

    describe("column", () => {
        it("should return the parent column", () => {
            expect(cell.column()).toBe("COLUMN");
            expect(sheet.column).toHaveBeenCalledWith(3);
        });
    });

    describe("clear", () => {
        it("should clear the cell contents", () => {
            cell._value = "VALUE";
            cell._formulaType = "FORMULA_TYPE";
            cell._formula = "FORMULA";
            cell._sharedFormulaId = "SHARED_FORMULA_ID";

            expect(cell.clear()).toBe(cell);

            expect(cell._value).toBeUndefined();
            expect(cell._formulaType).toBeUndefined();
            expect(cell._formula).toBeUndefined();
            expect(cell._sharedFormulaId).toBeUndefined();

            expect(sheet.clearCellsUsingSharedFormula).not.toHaveBeenCalled();
        });

        it("should clear the cell with shared ref", () => {
            cell._value = "VALUE";
            cell._formulaType = "FORMULA_TYPE";
            cell._formula = "FORMULA";
            cell._sharedFormulaId = "SHARED_FORMULA_ID";
            cell._formulaRef = "FORMULA_REF";

            expect(cell.clear()).toBe(cell);

            expect(cell._value).toBeUndefined();
            expect(cell._formulaType).toBeUndefined();
            expect(cell._formula).toBeUndefined();
            expect(cell._sharedFormulaId).toBeUndefined();
            expect(cell._formulaRef).toBeUndefined();

            expect(sheet.clearCellsUsingSharedFormula).toHaveBeenCalledWith("SHARED_FORMULA_ID");
        });
    });

    describe("columnName", () => {
        it("should return the column name", () => {
            spyOn(cell, "columnNumber").and.returnValue(3);
            expect(cell.columnName()).toBe("C");
        });
    });

    describe("columnNumber", () => {
        it("should return the column number", () => {
            cell._columnNumber = 3;
            expect(cell.columnNumber()).toBe(3);
        });
    });

    describe("formula", () => {
        it("should return undefined if formula not set", () => {
            expect(cell.formula()).toBeUndefined();
        });

        it("should return the formula if set", () => {
            cell._formula = "FORMULA";
            expect(cell.formula()).toBe("FORMULA");
        });

        it("should return the shared formula if the ref cell", () => {
            cell._formula = "FORMULA";
            cell._formulaType = "shared";
            cell._formulaRef = "REF";
            expect(cell.formula()).toBe("FORMULA");
        });

        it("should return 'SHARED' if shared formula set", () => {
            cell._formula = "FORMULA";
            cell._formulaType = "shared";
            expect(cell.formula()).toBe("SHARED");
        });

        it("should clear the formula", () => {
            cell._formula = "FORMULA";
            cell._formulaType = "TYPE";

            expect(cell.formula(undefined)).toBe(cell);

            expect(cell._formula).toBeUndefined();
            expect(cell._formulaType).toBeUndefined();
        });

        it("should set the formula and clear the value", () => {
            cell._value = "VALUE";

            expect(cell.formula("FORMULA")).toBe(cell);

            expect(cell._value).toBeUndefined();
            expect(cell._formula).toBe("FORMULA");
            expect(cell._formulaType).toBe('normal');
        });
    });

    describe("hyperlink", () => {
        it("should get the hyperlink from the sheet", () => {
            expect(cell.hyperlink()).toBe("HYPERLINK");
            expect(sheet.hyperlink).toHaveBeenCalledWith("C7");
        });

        it("should set the hyperlink on the sheet", () => {
            expect(cell.hyperlink("HYPERLINK")).toBe(cell);
            expect(sheet.hyperlink).toHaveBeenCalledWith("C7", "HYPERLINK");
        });
    });

    describe("find", () => {
        beforeEach(() => {
            spyOn(cell, 'value');
        });

        it("should return true if substring found and false otherwise", () => {
            cell.value.and.returnValue("Foo bar baz");
            expect(cell.find('bar')).toBe(true);
            expect(cell.find('BAR')).toBe(true);
            expect(cell.find('goo')).toBe(false);
        });

        it("should return true if regex matches and false otherwise", () => {
            cell.value.and.returnValue("Foo bar baz");
            expect(cell.find(/\w{3}/)).toBe(true);
            expect(cell.find(/\w{4}/)).toBe(false);
            expect(cell.find(/Foo/)).toBe(true);
        });

        it("should replace all occurences of substring", () => {
            cell.value.and.returnValue("Foo bar baz foo");
            expect(cell.find('foo', 'XXX')).toBe(true);
            expect(cell.value).toHaveBeenCalledWith('XXX bar baz XXX');
            cell.value.calls.reset();

            cell.value.and.returnValue("Foo bar baz foo");
            expect(cell.find('foot', 'XXX')).toBe(false);
            expect(cell.value).not.toHaveBeenCalledWith(jasmine.any(String));
        });

        it("should replace regex matches", () => {
            cell.value.and.returnValue("Foo bar baz foo");
            expect(cell.find(/[a-z]{3}/, 'XXX')).toBe(true);
            expect(cell.value).toHaveBeenCalledWith('Foo XXX baz foo');
        });

        it("should replace regex matches", () => {
            cell.value.and.returnValue("Foo bar baz foo");
            const replacer = jasmine.createSpy('replacer').and.returnValue("REPLACEMENT");
            expect(cell.find(/(\w)(o{2})/g, replacer)).toBe(true);
            expect(cell.value).toHaveBeenCalledWith('REPLACEMENT bar baz REPLACEMENT');
            expect(replacer).toHaveBeenCalledWith('Foo', 'F', 'oo', 0, 'Foo bar baz foo');
            expect(replacer).toHaveBeenCalledWith('foo', 'f', 'oo', 12, 'Foo bar baz foo');
        });
    });

    describe("tap", () => {
        it("should call the callback and return the cell", () => {
            const callback = jasmine.createSpy('callback').and.returnValue("RETURN");
            expect(cell.tap(callback)).toBe(cell);
            expect(callback).toHaveBeenCalledWith(cell);
        });
    });

    describe("thru", () => {
        it("should call the callback and return the callback return value", () => {
            const callback = jasmine.createSpy('callback').and.returnValue("RETURN");
            expect(cell.thru(callback)).toBe("RETURN");
            expect(callback).toHaveBeenCalledWith(cell);
        });
    });

    describe("rangeTo", () => {
        it("should create a range", () => {
            expect(cell.rangeTo("OTHER")).toBe("RANGE");
            expect(sheet.range).toHaveBeenCalledWith(cell, "OTHER");
        });
    });

    describe("relativeCell", () => {
        it("should call sheet.cell with the appropriate row/column", () => {
            sheet.cell.and.returnValue("CELL");

            expect(cell.relativeCell(0, 0)).toBe("CELL");
            expect(sheet.cell).toHaveBeenCalledWith(7, 3);
            sheet.cell.calls.reset();

            expect(cell.relativeCell(-2, -1)).toBe("CELL");
            expect(sheet.cell).toHaveBeenCalledWith(5, 2);
            sheet.cell.calls.reset();

            expect(cell.relativeCell(5, 2)).toBe("CELL");
            expect(sheet.cell).toHaveBeenCalledWith(12, 5);
            sheet.cell.calls.reset();
        });
    });

    describe("row", () => {
        it("should return the parent row", () => {
            expect(cell.row()).toBe(row);
        });
    });

    describe("rowNumber", () => {
        it("should return the row number", () => {
            expect(cell.rowNumber()).toBe(7);
        });
    });

    describe("sheet", () => {
        it("should return the parent sheet", () => {
            expect(cell.sheet()).toBe(sheet);
        });
    });

    describe("style", () => {
        it("should create a new style with the set style ID", () => {
            cell._styleId = 2;
            expect(cell._style).toBeUndefined();
            cell.style("foo");
            expect(styleSheet.createStyle).toHaveBeenCalledWith(2);
            expect(cell._style).toBe(style);
        });

        it("should not create a style if one already exists", () => {
            cell._style = style;
            cell.style("foo");
            expect(styleSheet.createStyle).not.toHaveBeenCalled();
        });

        it("should get a single style", () => {
            expect(cell.style("foo")).toBe("STYLE:foo");
            expect(style.style).toHaveBeenCalledWith("foo");
        });

        it("should get multiple styles", () => {
            expect(cell.style(["foo", "bar", "baz"])).toEqualJson({
                foo: "STYLE:foo", bar: "STYLE:bar", baz: "STYLE:baz"
            });
            expect(style.style).toHaveBeenCalledWith("foo");
            expect(style.style).toHaveBeenCalledWith("bar");
            expect(style.style).toHaveBeenCalledWith("baz");
        });

        it("should set a single style", () => {
            expect(cell.style("foo", "value")).toBe(cell);
            expect(style.style).toHaveBeenCalledWith("foo", "value");
        });

        it("should set multiple styles", () => {
            expect(cell.style({
                foo: "FOO", bar: "BAR", baz: "BAZ"
            })).toBe(cell);
            expect(style.style).toHaveBeenCalledWith("foo", "FOO");
            expect(style.style).toHaveBeenCalledWith("bar", "BAR");
            expect(style.style).toHaveBeenCalledWith("baz", "BAZ");
        });
    });

    describe("value", () => {
        beforeEach(() => {
            spyOn(cell, "clear");
        });

        it("should get the value", () => {
            expect(cell.value()).toBeUndefined();
            cell._value = "foo";
            expect(cell.value()).toBe('foo');
        });

        it("should clear the cell", () => {
            cell._value = "foo";
            cell.value(undefined);
            expect(cell._value).toBeUndefined();
            expect(cell.clear).toHaveBeenCalledWith();
        });

        it("should clear the cell and set the value", () => {
            cell.value(5.6);
            expect(cell._value).toBe(5.6);
            expect(cell.clear).toHaveBeenCalledWith();
        });
    });

    describe("workbook", () => {
        it("should return the workbook from the row", () => {
            expect(cell.workbook()).toBe(workbook);
        });
    });

    /* INTERNAL */

    describe("getSharedRefFormula", () => {
        it("should return the shared ref formula", () => {
            cell._formulaType = 'shared';
            cell._formulaRef = 'REF';
            cell._formula = "FORMULA";
            expect(cell.getSharedRefFormula()).toBe("FORMULA");
        });

        it("should return undefined if not a ref cell", () => {
            cell._formulaType = 'shared';
            cell._formula = "FORMULA";
            expect(cell.getSharedRefFormula()).toBeUndefined();
        });

        it("should return undefined if not a shared cell", () => {
            cell._formulaType = 'array';
            cell._formulaRef = 'REF';
            cell._formula = "FORMULA";
            expect(cell.getSharedRefFormula()).toBeUndefined();
        });
    });

    describe("sharesFormula", () => {
        it("should return true/false if shares a given formula or not", () => {
            cell._formulaType = "shared";
            cell._sharedFormulaId = 6;

            expect(cell.sharesFormula(6)).toBe(true);
            expect(cell.sharesFormula(3)).toBe(false);
        });

        it("should return false if it doesn't share any formula", () => {
            expect(cell.sharesFormula(6)).toBe(false);
        });
    });

    describe("setSharedFormula", () => {
        it("should set a shared formula", () => {
            spyOn(cell, "clear");
            cell.setSharedFormula(3, "A1*A2", "A1:C1");
            expect(cell.clear).toHaveBeenCalledWith();
            expect(cell._formulaType).toBe("shared");
            expect(cell._sharedFormulaId).toBe(3);
            expect(cell._formula).toBe("A1*A2");
            expect(cell._formulaRef).toBe("A1:C1");
        });
    });

    describe("toXml", () => {
        beforeEach(() => {
            cell.clear();
        });

        it("should set the cell address", () => {
            expect(cell.toXml().attributes.r).toBe("C7");
        });

        it("should set the formula", () => {
            cell._formulaType = "TYPE";
            cell._formula = "FORMULA";
            cell._formulaRef = "REF";
            cell._sharedFormulaId = "SHARED_ID";

            expect(cell.toXml().children).toEqualJson([{
                name: 'f',
                attributes: {
                    t: 'TYPE',
                    ref: 'REF',
                    si: 'SHARED_ID'
                },
                children: ['FORMULA']
            }]);
        });

        it("should set the formula with remaining attributes", () => {
            cell._formulaType = "normal";
            cell._formula = "FORMULA";
            cell._remainingFormulaAttributes = { foo: 'foo' };

            expect(cell.toXml().children).toEqualJson([{
                name: 'f',
                attributes: {
                    foo: 'foo'
                },
                children: ['FORMULA']
            }]);
        });

        it("should not set the value if the formula is set", () => {
            cell._formulaType = "TYPE";
            cell._value = "VALUE";

            expect(cell.toXml().children).toEqualJson([{
                name: 'f',
                attributes: {
                    t: 'TYPE'
                }
            }]);
        });

        it("should set a string value", () => {
            cell._value = "STRING";

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7",
                    t: 's'
                },
                children: [{
                    name: 'v',
                    children: [7]
                }]
            });
            expect(sharedStrings.getIndexForString).toHaveBeenCalledWith('STRING');
        });

        it("should set a rich text value", () => {
            cell._value = [{ name: 'r' }];

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7",
                    t: 's'
                },
                children: [{
                    name: 'v',
                    children: [7]
                }]
            });
            expect(sharedStrings.getIndexForString).toHaveBeenCalledWith([{ name: 'r' }]);
        });

        it("should set a true bool value", () => {
            cell._value = true;

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7",
                    t: 'b'
                },
                children: [{
                    name: 'v',
                    children: [1]
                }]
            });
        });

        it("should set a false bool value", () => {
            cell._value = false;

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7",
                    t: 'b'
                },
                children: [{
                    name: 'v',
                    children: [0]
                }]
            });
        });

        it("should set a number value", () => {
            cell._value = -6.89;

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7"
                },
                children: [{
                    name: 'v',
                    children: [-6.89]
                }]
            });
        });

        it("should set a date value", () => {
            cell._value = new Date(2017, 0, 1);

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7"
                },
                children: [{
                    name: 'v',
                    children: [42736]
                }]
            });
        });

        it("should set the defined style id", () => {
            cell._styleId = "STYLE_ID";
            expect(cell.toXml().attributes.s).toBe("STYLE_ID");
        });

        it("should set the id from the style", () => {
            cell._style = style;
            expect(cell.toXml().attributes.s).toBe(4);
        });

        it("should handle an empty cell", () => {
            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7"
                },
                children: []
            });
        });

        it("should preserve remaining attributes and children", () => {
            cell._value = -6.89;
            cell._remainingAttributes = { foo: 'foo', bar: 'bar' };
            cell._remainingChildren = [{ name: 'foo' }, { name: 'bar' }];

            expect(cell.toXml()).toEqualJson({
                name: 'c',
                attributes: {
                    r: "C7",
                    foo: 'foo',
                    bar: 'bar'
                },
                children: [{
                    name: 'v',
                    children: [-6.89]
                }, { name: 'foo' }, { name: 'bar' }]
            });
        });
    });

    /* PRIVATE */

    describe("_init", () => {
        beforeEach(() => {
            cell.clear();
            delete cell._columnNumber;
            spyOn(cell, "_parseNode");
        });

        it("should parse the node", () => {
            const node = {};
            cell._init(node);
            expect(cell._columnNumber).toBeUndefined();
            expect(cell._parseNode).toHaveBeenCalledWith(node);
        });

        it("should init a cell without a node", () => {
            cell._init(5, 3);
            expect(cell._columnNumber).toBe(5);
            expect(cell._styleId).toBe(3);
            expect(cell._parseNode).not.toHaveBeenCalled();
        });
    });

    describe("_parseNode", () => {
        let node;

        beforeEach(() => {
            node = {
                attributes: {
                    r: "D8"
                }
            };

            cell.clear();
            delete cell._columnNumber;
            sheet.updateMaxSharedFormulaId.calls.reset();
        });

        it("should parse the column number", () => {
            cell._parseNode(node);
            expect(cell._columnNumber).toBe(4);
        });

        it("should store the style ID", () => {
            node.attributes.s = "STYLE_ID";
            cell._parseNode(node);
            expect(cell._styleId).toBe("STYLE_ID");
        });

        it("should parse a normal formula", () => {
            node.children = [{
                name: 'f',
                attributes: {},
                children: ["FORMULA"]
            }];

            cell._parseNode(node);
            expect(cell._formulaType).toBe("normal");
            expect(cell._formula).toBe("FORMULA");
            expect(cell._formulaRef).toBeUndefined();
            expect(cell._sharedFormulaId).toBeUndefined();
            expect(cell._remainingFormulaAttributes).toBeUndefined();
            expect(sheet.updateMaxSharedFormulaId).not.toHaveBeenCalled();
        });

        it("should parse a shared formula", () => {
            node.children = [{
                name: 'f',
                attributes: {
                    t: "shared",
                    ref: "REF",
                    si: "SHARED_INDEX"
                },
                children: ["FORMULA"]
            }];

            cell._parseNode(node);
            expect(cell._formulaType).toBe("shared");
            expect(cell._formula).toBe("FORMULA");
            expect(cell._formulaRef).toBe("REF");
            expect(cell._sharedFormulaId).toBe("SHARED_INDEX");
            expect(cell._remainingFormulaAttributes).toBeUndefined();
            expect(sheet.updateMaxSharedFormulaId).toHaveBeenCalledWith("SHARED_INDEX");
        });

        it("should preserve unknown formula attributes", () => {
            node.children = [{
                name: 'f',
                attributes: {
                    t: "TYPE",
                    foo: "foo",
                    bar: "bar"
                },
                children: []
            }];

            cell._parseNode(node);
            expect(cell._formulaType).toBe("TYPE");
            expect(cell._formula).toBeUndefined();
            expect(cell._formulaRef).toBeUndefined();
            expect(cell._sharedFormulaId).toBeUndefined();
            expect(cell._remainingFormulaAttributes).toEqualJson({
                foo: "foo",
                bar: "bar"
            });
            expect(sheet.updateMaxSharedFormulaId).not.toHaveBeenCalled();
        });

        it("should parse string values", () => {
            node.attributes.t = "s";
            node.children = [{
                name: 'v',
                children: [5]
            }];

            cell._parseNode(node);
            expect(cell._value).toBe("STRING");
            expect(sharedStrings.getStringByIndex).toHaveBeenCalledWith(5);
        });

        it("should parse inline string values", () => {
            node.attributes.t = "inlineStr";
            node.children = [{
                name: 'is',
                children: [{
                    name: 't',
                    children: ["INLINE_STRING"]
                }]
            }];

            cell._parseNode(node);
            expect(cell._value).toBe("INLINE_STRING");
        });

        it("should parse inline string rich text values", () => {
            node.attributes.t = "inlineStr";
            node.children = [{
                name: 'is',
                children: [{
                    name: 'r',
                    children: [{
                        name: 't',
                        children: "FOO"
                    }]
                }]
            }];

            cell._parseNode(node);
            expect(cell._value).toEqualJson([{
                name: 'r',
                children: [{
                    name: 't',
                    children: "FOO"
                }]
            }]);
        });

        it("should parse true values", () => {
            node.attributes.t = "b";
            node.children = [{
                name: 'v',
                children: [1]
            }];

            cell._parseNode(node);
            expect(cell._value).toBe(true);
        });

        it("should parse false values", () => {
            node.attributes.t = "b";
            node.children = [{
                name: 'v',
                children: [0]
            }];

            cell._parseNode(node);
            expect(cell._value).toBe(false);
        });

        it("should parse error values", () => {
            node.attributes.t = "e";
            node.children = [{
                name: 'v',
                children: ["#ERR"]
            }];

            cell._parseNode(node);
            expect(cell._value).toBe("ERROR");
            expect(FormulaError.getError).toHaveBeenCalledWith("#ERR");
        });

        it("should parse number values", () => {
            node.children = [{
                name: 'v',
                children: [-1.67]
            }];

            cell._parseNode(node);
            expect(cell._value).toBe(-1.67);
            expect(cell._remainingAttributes).toBeUndefined();
            expect(cell._remainingChildren).toBeUndefined();
        });

        it("should handle empty cells", () => {
            cell._parseNode(node);
            expect(cell._value).toBeUndefined();
        });

        it("should preserve unknown attributes and children", () => {
            node.attributes.foo = "foo";
            node.attributes.bar = "bar";
            node.children = [{
                name: 'v',
                children: [0]
            }, {
                name: 'foo'
            }, {
                name: 'bar'
            }];

            cell._parseNode(node);
            expect(cell._value).toBe(0);
            expect(cell._remainingAttributes).toEqualJson({
                foo: "foo",
                bar: "bar"
            });
            expect(cell._remainingChildren).toEqualJson([
                { name: 'foo' },
                { name: 'bar' }
            ]);
        });
    });
});
