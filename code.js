
$(function () {
  //初始化
  (function init() {

    const jsonEditorCachekey = 'jsonEditor';

    let resultDartCode = '';

    let jsonTestCase = {
      "some_snake_case_prop": "",
      "anInt": 1,
      "aDouble": 2.3,
      "aString": "hello",
      "aBool": false,
      "anObj": {
        "name": "x",
        "age": 18.1
      },
      "anObjList": [
        {
          "name": "y"
        }
      ],
      "aStrList": [
        "something"
      ],
      "multidimensional": [
        [
          [
            {
              "name": "y"
            }
          ]
        ]
      ]
    };

    // create the editor
    const container = document.getElementById("origJsonContainer")
    const options = {
      "mode": "code",
      onChangeText: (str) => {
        $.cookie(jsonEditorCachekey, str);
        generate();
      },
    }
    const editor = new JSONEditor(container, options)

    function tryParseJSON(jsonString) {
      try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
          return o;
        }
      }
      catch (e) { }
      return false;
    }

    function generate() {
      hideInfo();
      let jsonObj;
      try {
        jsonObj = editor.get();
      } catch (error) {
        $('#dartCode').html(error.toString());
        return;
      }

      let forceStringCheckBox = $('#forceStringCheckBox').prop('checked');

      //snake to camel
      const snakeToCamel = (str) => str.replace(
        /([-_][a-z])/g,
        (group) => group.toUpperCase()
          .replace('-', '')
          .replace('_', '')
      );

      //去除重复元素
      let removeSurplusElement = (obj) => {
        if (Array.isArray(obj)) {
          obj.length = 1;
          removeSurplusElement(obj[0]);
        }
        else if (typeof obj === 'object') {
          for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
              removeSurplusElement(obj[key])
            }
          }
        }
      };
      //大写转换
      let uppercaseFirst = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };
      //Dart关键字保护
      let dartKeywordDefence = key => {
        if (typeof key === 'string') {
          //https://dart.dev/guides/language/language-tour
          let reservedKeywords = ["num", "double", "int", "String", "bool", "List", "abstract", "dynamic", "implements", "show", "as", "else", "import", "static", "assert", "enum", "in", "super", "async", "export", "interface", "switch", "await", "extends", "is", "sync", "break", "external", "library", "this", "case", "factory", "mixin", "throw", "catch", "false", "new", "true", "class", "final", "null", "try", "const", "finally", "on", "typedef", "continue", "for", "operator", "var", "covariant", "Function", "part", "void", "default", "get", "rethrow", "while", "deferred", "hide", "return", "with", "do", "if", "set", "yield"];
          if (reservedKeywords.includes(key)) {
            return `the${uppercaseFirst(key)}`;
          }
        }
        return key;
      };

      //泛型字符串生成器
      let genericStringGenerator = (innerClass, count) => {
        let genericStrings = [innerClass];
        while (count) {
          genericStrings.unshift('List<');
          genericStrings.push('>');
          count--;
        }
        let genericString = genericStrings.join('');
        return genericString;
      }

      //!获取最内层对象,类型和层数
      let getInnerObjInfo = (arr, className) => {
        let count = 0;
        let getInnerObj = (arr) => {
          if (Array.isArray(arr)) {
            let first = arr[0];
            count++;
            return getInnerObj(first);
          }
          else {
            return arr;
          }
        }

        let inner = getInnerObj(arr);
        let innerClass = className;
        if (typeof inner === 'object') {
        }
        else if (typeof inner === 'boolean') {
          //we don't handle boolean
          innerClass = 'bool';
        }
        else {
          if (typeof inner === 'string') {
            innerClass = 'String';
          }
          if (typeof inner === 'number') {
            if (Number.isInteger(inner)) {
              innerClass = 'int';

            } else {
              innerClass = 'double';
            }
          }
          if (forceStringCheckBox) {
            innerClass = 'String';
          }
        }
        return { inner, innerClass, count };
      };
      //!获取数组循环语句
      let getIterateLines = (arr, className, key, legalKey, jsonKey) => {

        function makeBlank(count) {
          let str = '';
          for (let index = 0; index < count + 1; index++) {
            str += '  ';
          }
          return str;
        };

        let { inner, innerClass, count } = getInnerObjInfo(arr, className);
        if (inner === undefined || inner === null) {
          showInfo(`WARNING : the property named &nbsp <b>'${key}'</b> &nbsp is an EMPTY array ! parse process is failed !`);
          return { fromJsonLinesJoined: "    >>>>>>error<<<<<<\n", toJsonLinesJoined: "    >>>>>>error<<<<<<\n" };
        }
        let total = count;
        let fromJsonLines = [];
        let toJsonLines = [];

        count--;

        if (typeof inner === 'object') {
          fromJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(${className}.fromJson(v));\n${makeBlank(count * 3)}});`);
          toJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v.toJson());\n${makeBlank(count * 3)}});`);
        } else {
          let toType = '';
          if (typeof inner === 'boolean') {
            //we don't handle boolean
          }
          else {
            if (forceStringCheckBox) {
              inner = inner.toString();
            }
            if (typeof inner === 'string') {
              toType = '.toString()';
            }
            if (typeof inner === 'number') {
              if (Number.isInteger(inner)) {
                toType = '.toInt()';
              } else {
                toType = '.toDouble()';
              }
            }
          }
          if ((typeof inner === 'string') || (typeof inner === 'number') || (typeof inner === 'boolean')) {
            fromJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v${toType});\n${makeBlank(count * 3)}});`);
            toJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v);\n${makeBlank(count * 3)}});`);
          }
        }

        while (count) {
          fromJsonLines.unshift(`${makeBlank(count * 2)}v.forEach((v) {\n${makeBlank(count * 3)}var arr${count} = ${genericStringGenerator(innerClass, total - count)}();`);
          fromJsonLines.push(`${makeBlank(count * 3)}arr${count - 1}.add(arr${count});\n${makeBlank(count * 2)}});`);
          toJsonLines.unshift(`${makeBlank(count * 2)}v.forEach((v) {\n${makeBlank(count * 3)}var arr${count} = List();`);
          toJsonLines.push(`${makeBlank(count * 3)}arr${count - 1}.add(arr${count});\n${makeBlank(count * 2)}});`);
          count--;
        }

        fromJsonLines.unshift(`${makeBlank(count * 2)}if (json[${jsonKey}] != null) {\n${makeBlank(count * 2)}var v = json[${jsonKey}];\n${makeBlank(count * 2)}var arr0 = ${genericStringGenerator(innerClass, total)}();`);
        fromJsonLines.push(`${makeBlank(count * 2)}${makeBlank(count)}${legalKey} = arr0;\n    }\n`);
        toJsonLines.unshift(`    if (${legalKey} != null) {\n      var v = ${legalKey};\n      var arr0 = List();`);
        toJsonLines.push(`      data[${jsonKey}] = arr0;\n    }\n`);

        let fromJsonLinesJoined = fromJsonLines.join('\r\n');
        let toJsonLinesJoined = toJsonLines.join('\r\n');
        return { fromJsonLinesJoined, toJsonLinesJoined };
      };

      //!json对象转dart
      let objToDart = (jsonObj, prefix, baseClass) => {

        if (Array.isArray(jsonObj)) {
          return objToDart(jsonObj[0], prefix, baseClass);
        }

        let lines = [];

        let jsonKeysLines = [];

        let propsLines = [];
        let constructorLines = [];
        let fromJsonLines = [];
        let toJsonLines = [];

        let shouldUsingJsonKey = $('#usingJsonKeyCheckBox').prop('checked');
        let isJsonKeyPrivate = $('#jsonKeyPrivateCheckBox').prop('checked');
        let shouldConvertSnakeToCamel = $('#camelCheckBox').prop('checked');

        let className = `${prefix}${uppercaseFirst(baseClass)}`;
        if (shouldConvertSnakeToCamel) {
          className = snakeToCamel(className);
        }

        lines.push(`class ${className} {`);
        lines.push(`/*\r\n${JSON.stringify(jsonObj, null, 2)} \r\n*/\r\n`);

        constructorLines.push(`  ${className}({\n`);
        fromJsonLines.push(`  ${className}.fromJson(Map<String, dynamic> json) {\n`);
        toJsonLines.push(`  Map<String, dynamic> toJson() {\n`);
        toJsonLines.push(`    final Map<String, dynamic> data = Map<String, dynamic>();\n`);

        for (let key in jsonObj) {
          if (jsonObj.hasOwnProperty(key)) {
            let element = jsonObj[key];

            let legalKey = dartKeywordDefence(key);

            if (shouldConvertSnakeToCamel) {
              legalKey = snakeToCamel(legalKey);
            }

            let jsonKey = `"${key}"`;
            if (shouldUsingJsonKey) {
              jsonKey = `${isJsonKeyPrivate ? '_' : ''}jsonKey${className}${uppercaseFirst(legalKey)}`;
            }
            jsonKeysLines.push(`const String ${jsonKey} = "${key}";`);
            constructorLines.push(`    this.${legalKey},\n`);
            if (element === null) {
              //!显示错误信息
              showInfo(`WARNING : the Property named '${key}' is null,which will be treated as String type`);
              element = '';
            }
            if (typeof element === 'object') {

              let subClassName = `${className}${uppercaseFirst(key)}`;
              if (shouldConvertSnakeToCamel) {
                subClassName = snakeToCamel(subClassName);
              }
              if (Array.isArray(element)) {
                let { inner, innerClass, count } = getInnerObjInfo(element, subClassName);
                let { fromJsonLinesJoined, toJsonLinesJoined } = getIterateLines(element, subClassName, key, legalKey, jsonKey);
                let genericString = genericStringGenerator(innerClass, count);
                propsLines.push(`  ${genericString} ${legalKey};\n`);
                fromJsonLines.push(fromJsonLinesJoined);
                toJsonLines.push(toJsonLinesJoined);
                if (typeof inner === 'object') {
                  lines.unshift(objToDart(element, className, key));
                }
              }
              else {
                lines.unshift(objToDart(element, className, key));
                propsLines.push(`  ${subClassName} ${legalKey};\n`);
                fromJsonLines.push(`    ${legalKey} = json[${jsonKey}] != null ? ${subClassName}.fromJson(json[${jsonKey}]) : null;\n`);
                toJsonLines.push(`    if (${legalKey} != null) {\n      data[${jsonKey}] = ${legalKey}.toJson();\n    }\n`);
              }
            }
            else {
              let toType = '';
              let type = '';
              if (typeof element === 'boolean') {
                //bool is special
                type = 'bool';
              }
              else {
                if (forceStringCheckBox) {
                  element = element.toString();
                }
                if (typeof element === 'string') {
                  toType = '?.toString()';
                  type = 'String';
                }
                else if (typeof element === 'number') {
                  if (Number.isInteger(element)) {
                    toType = '?.toInt()';
                    type = 'int';
                  } else {
                    toType = '?.toDouble()';
                    type = 'double';
                  }
                }
              }
              propsLines.push(`  ${type} ${legalKey};\n`);
              fromJsonLines.push(`    ${legalKey} = json[${jsonKey}]${toType};\n`);
              toJsonLines.push(`    data[${jsonKey}] = ${legalKey};\n`);
            }
          }
        }
        if (shouldUsingJsonKey) {
          lines.unshift(jsonKeysLines.join('\n'));
        }

        constructorLines.push(`  });`);
        fromJsonLines.push(`  }`);
        toJsonLines.push(`    return data;\n  }`);

        lines.push(propsLines.join(''));
        lines.push(constructorLines.join(''));
        lines.push(fromJsonLines.join(''));
        lines.push(toJsonLines.join(''));

        lines.push(`}\n`);

        let linesOutput = lines.join('\r\n');

        return linesOutput;
      };

      removeSurplusElement(jsonObj);

      let rootClass = $('#classNameTextField').val();
      let dartCode = `///\n/// Code generated by jsonToDartModel https://ashamp.github.io/jsonToDartModel/\n///\n${objToDart(jsonObj, rootClass, "")}`;

      resultDartCode = dartCode;
      let highlightDartCode = hljs.highlight('dart', dartCode);
      $('#dartCode').html(highlightDartCode.value);
    }

    function showInfo(info) {
      $('.info').show().html(info);
    }
    function hideInfo() {
      $('.info').hide();
    }

    function textFieldBinding(tfID, defaultValue) {
      let selector = '#' + tfID;
      let strFromCookie = $.cookie(tfID);
      if ((strFromCookie === undefined || strFromCookie.length === 0) && defaultValue) {
        $.cookie(tfID, defaultValue);
      }
      $(selector).val($.cookie(tfID));
      $(selector).on('input', function (e) {
        let text = $(this).val();
        $.cookie(tfID, text);
        generate();
      });
    }

    //textFieldBinding('origJsonTextarea', jsonTestCase);
    textFieldBinding('classNameTextField', 'SomeRootEntity');

    function jsonEditorBinding(tfID, defaultValue) {
      let str = $.cookie(jsonEditorCachekey);
      if (str.length) {
        editor.setText(str);
      } else {
        editor.set(jsonTestCase);
      }
    }
    jsonEditorBinding();

    function checkBoxBinding(checkBoxID, checked) {
      let defaultValue = checked ? '1' : '0';
      let selector = '#' + checkBoxID;
      let strFromCookie = $.cookie(checkBoxID);
      if (strFromCookie === undefined || strFromCookie.length === 0) {
        $.cookie(checkBoxID, defaultValue);
      }
      checked = $.cookie(checkBoxID) === '1';
      $(selector).prop('checked', checked);
      $(selector).on('change', function () {
        let checked = $(this).prop('checked') ? '1' : '0';
        $.cookie(checkBoxID, checked);
        generate();
      });
    }

    checkBoxBinding('jsonKeyPrivateCheckBox', true);
    checkBoxBinding('usingJsonKeyCheckBox', false);
    checkBoxBinding('camelCheckBox', true);
    checkBoxBinding('forceStringCheckBox', false);

    $('#usingJsonKeyCheckBox').on('change', function () {
      $('#jsonKeyPrivateCheckBox').prop('disabled', !(this.checked));
    });
    $('#jsonKeyPrivateCheckBox').prop('disabled', !($('#usingJsonKeyCheckBox').prop('checked')));

    generate();

    function copyToClipboard(text) {
      var $temp = $("<textarea>");
      $("body").append($temp);
      $temp.val(text).select();
      document.execCommand("copy");
      $temp.remove();
    }

    $('#copyFileBtn').click(function () {
      copyToClipboard(resultDartCode);
    });

  })();
});