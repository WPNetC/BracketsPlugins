define(function (require) {
	'use strict';

	var Color = require('color'),
		colors = require('definedcolors'),
		onlyParseIfNew = true;

	function processElement(e, color, tcolor) {
		e.style.backgroundColor = tcolor;
		e.style.borderRadius = '2px';
		e.style.color = color.light() < 50 ? '#fff' : '#000';
	}

	function parseCSSNumber(s) {
		s = s.trim();
		if (s[s.length - 1] == '%') {
			return parseInt(s) * 2.55;
		} else {
			return parseInt(s);
		}
	}

	function nextNodeValue(nd) {
		var sb = nd.nextSibling;
		if (sb) {
			sb = sb.nodeValue;
			return sb ? sb.trim() : null;
		}
		return null;
	}

	function isCMNumber(e) {
		return e && e.className == 'cm-number';
	}

	function sassRgbaText(startElement, endElement) {
		var scolor = '';
		do {
			scolor += startElement.innerText;
			var nsb = startElement.nextSibling;
			if (nsb) {
				nsb = nsb.nodeValue;
				if (nsb) {
					scolor += nsb;
				}
			}
			startElement = startElement.nextElementSibling;
		} while (startElement != endElement)
		return scolor + endElement.innerText.split(')')[0] + ')'
	}

	function sassPercentOrBracket(e) {
		if (!e) {
			return null
		}
		var s = e.innerText;
		if (!s) {
			return null;
		}
		var pInd = s.indexOf('%');
		var bInd = s.indexOf(')');
		if (pInd > -1) {
			if (bInd <= pInd) {
				e = e.nextElementSibling;
				if (!e || e.className != 'cm-operator' || e.innerText[0] != ')') {
					return null;
				}
			}
			return e;
		}
		return null;
	}

	// Original 'process' method. Moved so can be defferd.
	function realProcess(cm, _, node) {
		var mode = cm.options.mode;
		var nodes = [];

		switch (mode) {
			case 'sass':
				nodes = node.querySelectorAll('.cm-attribute, .cm-number, .cm-variable');
				break;
			case 'text/x-scss':
				nodes = node.querySelectorAll('.cm-atom, .cm-variable-2');
				break;
			case 'text/x-styl':
				nodes = node.querySelectorAll('.cm-keyword, .cm-atom');
				break;
			default:
				nodes = node.getElementsByClassName('cm-atom');
		}
		for (var i = 0; i < nodes.length; i++) {
			var nd = nodes[i],
				color = null,
				scolor = "",
				nr, ng, nb, na,
				tr, tg, tb, tbracket;
			if (!nd.classList.contains('cm-error')) {
				var t = nd.innerText.trim();

				// Check for scss variable.
				if (nd.className === 'cm-variable-2' && mode === 'text/x-scss' && t[0] === '$') {
					color = colors.definedColors[t];
					if (color) {
						processElement(nd, color, 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + color.a + ')');
					}
				}
				// Check for plain hex color.
				else if (t[0] == '#' && (t.length == 3 + 1 || t.length == 6 + 1)) {
					color = Color.fromHexString(t);
					if (color) {
						// Add colour to list of defined colours.
						var vName = nd.previousElementSibling.innerText;
						colors.definedColors[vName] = color;
						// Process element.
						processElement(nd, color, t);

					}
				}
				// Check other color modes.
				else {
					t = t.toLowerCase();
					if (mode == 'sass') {
						if ((t == 'rgb' &&
								(tbracket = nd.nextElementSibling, tbracket && tbracket.innerText == '(') &&
								isCMNumber(nr = tbracket.nextElementSibling) &&
								nextNodeValue(nr) == ',' &&
								isCMNumber(ng = nr.nextElementSibling) &&
								nextNodeValue(ng) == ',' &&
								isCMNumber(nb = ng.nextElementSibling) &&
								(tbracket = nb.nextElementSibling, tbracket && tbracket.innerText[0] == ')')) ||
							(t == 'rgba' &&
								(tbracket = nd.nextElementSibling, tbracket && tbracket.innerText == '(') &&
								isCMNumber(nr = tbracket.nextElementSibling) &&
								nextNodeValue(nr) == ',' &&
								isCMNumber(ng = nr.nextElementSibling) &&
								nextNodeValue(ng) == ',' &&
								isCMNumber(nb = ng.nextElementSibling) &&
								nextNodeValue(nb) == ',' &&
								isCMNumber(na = nb.nextElementSibling) &&
								(tbracket = na.nextElementSibling, tbracket && tbracket.innerText[0] == ')'))
						) {
							color = new Color(parseCSSNumber(nr.innerText), parseCSSNumber(ng.innerText), parseCSSNumber(nb.innerText));
							scolor = sassRgbaText(nd, tbracket);
						} else if ((t == 'hsl' &&
								(tbracket = nd.nextElementSibling, tbracket && tbracket.innerText == '(') &&
								isCMNumber(nr = tbracket.nextElementSibling) &&
								nextNodeValue(nr) == ',' &&
								isCMNumber(ng = nr.nextElementSibling) &&
								(tbracket = ng.nextElementSibling, tbracket && tbracket.innerText == '%') &&
								nextNodeValue(tbracket) == ',' &&
								isCMNumber(nb = tbracket.nextElementSibling) &&
								(tbracket = sassPercentOrBracket(nb.nextElementSibling))) ||
							(t == 'hsla' &&
								(tbracket = nd.nextElementSibling, tbracket && tbracket.innerText == '(') &&
								isCMNumber(nr = tbracket.nextElementSibling) &&
								nextNodeValue(nr) == ',' &&
								isCMNumber(ng = nr.nextElementSibling) &&
								(tbracket = ng.nextElementSibling, tbracket && tbracket.innerText == '%') &&
								nextNodeValue(tbracket) == ',' &&
								isCMNumber(nb = tbracket.nextElementSibling) &&
								(tbracket = nb.nextElementSibling, tbracket && tbracket.innerText == '%') &&
								nextNodeValue(tbracket) == ',' &&
								isCMNumber(na = tbracket.nextElementSibling) &&
								(tbracket = na.nextElementSibling, tbracket && tbracket.innerText[0] == ')'))
						) {
							color = Color.fromHSL(parseInt(nr.innerText), parseInt(ng.innerText), parseInt(nb.innerText));
							scolor = sassRgbaText(nd, tbracket);
						}
					} else {
						if ((t == 'rgb' || t == 'hsl') &&
							nextNodeValue(nd) == '(' &&
							isCMNumber(nr = nd.nextElementSibling) &&
							nextNodeValue(nr) == ',' &&
							isCMNumber(ng = nr.nextElementSibling) &&
							nextNodeValue(ng) == ',' &&
							isCMNumber(nb = ng.nextElementSibling) &&
							nextNodeValue(nb)[0] == ')'
						) {
							if (t == 'rgb') {
								color = new Color(parseCSSNumber(tr = nr.innerText), parseCSSNumber(tg = ng.innerText), parseCSSNumber(tb = nb.innerText));
							} else {
								color = Color.fromHSL(parseInt(tr = nr.innerText), parseInt(tg = ng.innerText), parseInt(tb = nb.innerText));
							}
							scolor = nd.innerText + nd.nextSibling.nodeValue + tr + nr.nextSibling.nodeValue + tg + ng.nextSibling.nodeValue + tb + nb.nextSibling.nodeValue.split(')')[0] + ')';
						} else if ((t == 'rgba' || t == 'hsla') &&
							nextNodeValue(nd) == '(' &&
							isCMNumber(nr = nd.nextElementSibling) &&
							nextNodeValue(nr) == ',' &&
							isCMNumber(ng = nr.nextElementSibling) &&
							nextNodeValue(ng) == ',' &&
							isCMNumber(nb = ng.nextElementSibling) &&
							nextNodeValue(nb) == ',' &&
							isCMNumber(na = nb.nextElementSibling) &&
							nextNodeValue(na)[0] == ')'
						) {
							if (t == 'rgba') {
								color = new Color(parseCSSNumber(tr = nr.innerText), parseCSSNumber(tg = ng.innerText), parseCSSNumber(tb = nb.innerText));
							} else {
								color = Color.fromHSL(parseInt(tr = nr.innerText), parseInt(tg = ng.innerText), parseInt(tb = nb.innerText));
							}
							scolor = nd.innerText + nd.nextSibling.nodeValue + tr + nr.nextSibling.nodeValue + tg + ng.nextSibling.nodeValue + tb + nb.nextSibling.nodeValue + na.innerText + na.nextSibling.nodeValue.split(')')[0] + ')';
						}
					}
					if (color) {
						nd.dataset.color = scolor;
						nd.classList.add('h-phantom');
						processElement(nd, color, color.toHexString());
					}
				}
			}
		}
		nodes = [];
		if (mode === 'text/x-scss') {
			nodes = node.getElementsByClassName('cm-attribute');
			for (var i = 0; i < nodes.length; i++) {
				var nd = nodes[i];
				var t = nd.innerText.trim().toLowerCase();
				if (t in colors.definedColors) {
					processElement(nd, colors.definedColors[t], t);
				}
			}
		} else {
			switch (mode) {
				case 'sass':
					nodes = node.getElementsByClassName('cm-attribute');
					break;
				default:
					node.getElementsByClassName('cm-keyword');
					break;
			}
			for (var i = 0; i < nodes.length; i++) {
				var nd = nodes[i];
				var t = nd.innerText.trim().toLowerCase();
				if (t in colors.definedColors) {
					processElement(nd, colors.definedColors[t], t);
				}
			}
		}
	}

	function process(cm, _, node) {
		// If not yet processed other sass files, defer main process until we have found any color variables.
		var colorsLength = Object.keys(colors.definedColors).length;
		if (onlyParseIfNew && colorsLength <= 141) {
			var scssText = getText().done(function (files) {
				for (var fIdx in files) {
					var colorStrings = files[fIdx].content;
					for (var cIdx in colorStrings) {
						var cString = colorStrings[cIdx];
						var parts = cString.split(':');
						var cName = parts[0].trim();
						var cVal = parts[1].trim();
						var defColor = Color.fromHexString(cVal);
						if (defColor) {
							colors.definedColors[cName] = defColor;
						}
					}
				}
				realProcess(cm, _, node);
			});
		} else {
			realProcess(cm, _, node);
		}
	};

	/**
	 * Gets the text of all relevant documents.
	 *
	 * @returns {String} Text of all relevant documents (concatenated)
	 */
	var getText = function () {
		var AppInit = brackets.getModule("utils/AppInit"),
			CodeHintManager = brackets.getModule("editor/CodeHintManager"),
			DocumentManager = brackets.getModule("document/DocumentManager"),
			LanguageManager = brackets.getModule("language/LanguageManager"),
			ProjectManager = brackets.getModule("project/ProjectManager"),
			FileUtils = brackets.getModule("file/FileUtils"),
			Async = brackets.getModule("utils/Async");

		// Regex to match hex colours.
		var hashRegEx = /\$[\S\d]+:?\W#[0-9a-f]{3,6}/ig;
		var rgbaRegEx = /\$[\S\d]+:?\Wrgba\(?\W[0-9]{3},?\W[0-9]{3},?\W[0-9]{3},?\W[0-9.]+\)/ig;
		var rgbRegEx = /\$[\S\d]+:?\Wrgba\(?\W[0-9]{3},?\W[0-9]{3},?\W[0-9]{3}\)/ig;

		// All file extensions that are supported
		var fileextensions = ["sass", "scss"];

		// Promise for getHints method
		var result = new $.Deferred();
		// Contents of all relevant files
		var texts = [];

		// Get all relevant files (will be a promise)
		ProjectManager.getAllFiles(function (file) {

			// Check if file extension is in the set of supported ones
			return (fileextensions.indexOf(FileUtils.getFileExtension(file.fullPath)) !== -1);

		}).done(function (files) {

			// Read all files and push the contents to the texts array
			Async.doInParallel(files, function (file) {

				var parallelResult = new $.Deferred();

				DocumentManager.getDocumentText(file)
					.done(function (content) {

						var results = content.match(hashRegEx);
						texts.push({
							content: results,
							file: file
						});
						results = content.match(rgbaRegEx);
						texts.push({
							content: results,
							file: file
						});
						results = content.match(rgbRegEx);
						texts.push({
							content: results,
							file: file
						});

					}).always(function () {

						parallelResult.resolve();

					});

				return parallelResult.promise();

				// Give the contents back to caller
			}).always(function () {

				result.resolve(texts /*.join("\n\n")*/ );

			});

			// If something goes wrong, don't crash! Just do nothing!
		}).fail(function () {

			result.resolve("");

		}).fail(function () {

			result.resolve("");

		});


		return result.promise();

	};

	return {
		addHighlighter: function (cm) {
			if (!cm._colorHighlighter) {
				cm._colorHighlighter = true;
				cm.on('renderLine', process);
				process(cm, null, cm.display.lineDiv);
			}
		},
		destroyHighlighter: function (cm) {
			if (cm._colorHighlighter) {
				cm.off('renderLine', process);
				cm._colorHighlighter = null;
			}
		}
	};
});