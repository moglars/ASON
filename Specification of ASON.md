# Specification of ASON

## Introduction

The Aesthetically Pleasant Object Notation (ASON) is a text format that facilitates the notation of structured data. ASON is a syntax of hyphens, dots, spaces and line breaks that also tries to facilitate interpreting of structured data that is usually displayed in JSON. ASON was inspired by the syntax of the programming language Python that uses line breaks to structure the code. It was created because the author believed that whitespace is an integral part of many data structures that are perceived by humans. This text, for instance, is build from words that are separated by whitespace. The words itself contain letters that are separated by space. Whitespace seems to be an intuitive way to tell what belongs together (by applying less whitespace for elements that have more to do with each other). It is a fact, that many converter exist that add whitespace to text formats that are meant to be read by humans. By defining whitespace as a part of the syntax, ASON takes the choice for whitespace away and makes it mandatory. This enables to remove most special characters that are used in JSON for structuring, like braces, brackets, colons, commas and double quotes.

As JSON, ASON has a notation for maps and sequences. They are introduced by hyphens and dots. A line break and an additional space in front of the next line (indentation) introduces a new nested element. The indentation is a visual representation of the hierarchy of the structured data. It was decided to not allow tabs or more than one space for indentation to avoid the need for conventions.

ASON was created with JSON in mind. Because ASON only adds an additional layer between JSON and the human, it has to be fully compatible with JSON. ASON can be easily written and read by humans. It is expected that ASON data will be converted into JSON or an other more efficient format before it is further processed or transported by machines, because ASON is primarily designed for humans.

The idea for simpler notations (also for XML, CSS or JavaScript) was already there some years ago. The first implementation of ASON was created at the beginning of 2016, 15 years after JSON was first presented to the world.

## Tokens

An ASON text is a sequence of tokens that are generated by interpreting the text. Most tokens introduce a new context that is put onto a stack. The "left shift" token removes one or more contexts from the stack. There are only two context types: map and sequence. Each has its own possible tokens. A token has a type and an optional body. 

### Tokens in both contexts

* **left shift** - removes contexts from the stack. Number of contexts to remove is in token body.
* **value** - contains data like string, number, true, false or null

### Tokens in map context

* **map key** - introduces a new map context that is associated with a key
* **sequence key** - introduces a new sequence context that is associated with a key
* **key** - name of the key that holds a value
* **key for empty map** - name of the key for an empty map
* **key for empty sequence** - name of the key for an empty sequence

### Tokens in sequence context

* **anonymous map** - introduces a new map context
* **sequence** - introduces a new sequence 
* **empty map**
* **empty sequence**

The starting context is a sequence. In JSON, the context is explicitly set with braces, brackets or none of them. To get a map in the root context, the following rule is applied: If the root sequence contains only one map, sequence or value, it is interpreted as a map, sequence or value that is not in a sequence.

In JSON, there are special value types beside string, namely numbers, true, false or null. If an ASON value token contains a number as defined by JSON, it is interpreted as such. Same for true, false or null. To interpret these as strings, use a backslash character in front.

E.g.:

	true -> is interpreted as primitive value true
	\true -> is interpreted as the string containing the characters true
	\\true -> string with characters  \true
	etc.

## Tokenization

The ASON text is split into lines by line feed. Spaces in front of the line are consumed and depict the level of the line. If the level of the line is lower than one before, a **left shift** token is created. The body contains the number of levels to decrease. The line without the spaces in front will be called "content". Depending on the context, create tokens:

### Sequence context

* if the content starts with a dot and the next line is indented, create a token of type **sequence**.
* else if the content starts with a hyphen and next line is indented create a token of type **anonymous map**
* else if content starts with a dot, create a token of type **empty sequence**
* else if content starts with a hyphen, create a token of type **empty map**
* else create a token of type **value**. The body contains the content.

### Map context

* if the content starts with a dot and the next line is indented, create a token of type **sequence** key. The body contains the content without the dot at the beginning.
* else if the next line is indented, create a token of type **map key**.
* else if the content starts with a dot, create a token of type **key for empty sequence**. The body contains the content without the dot at the beginning.
* else if the content starts with a hyphen, create a token of type **key for empty map**. The body contains the content without the hyphen at the beginning.
* else split content at first unescaped space. Create a **key** token that contains the first part in the body and a **value** token that contains the second part (an escaped space character has a backslash in front). If no unescaped space is found, the whole content is the key and the value is an empty string.

## Escaping

ASON tries to make escaping only necessary in very rare occasions, because escaping needs an effort (typing in more characters, keeping in mind the special meanings). ASON assumes that invisible characters (U+0000 to U+001F) are only rarely used and doesn't provide any two-character escape sequences for them (differently from JSON). The standard escaping character is \ (called backslash or reverse solidus character) and refers to the Unicode code point U+005C. It is only consumed if it forms a valid escape sequence, otherwise it is displayed as is (in JSON it must be escaped itself). E.g. if the \ forms a valid escape sequence, all additional \ characters in front of the escape sequence are not consumed.

For convenience, the \uXXXX escape sequence is taken over from the JSON specification. It allows to specify a code point in four hexadecimal characters.

For convenience, the only two-character escaping sequence left is \n to represent a line break (more precisely a line feed character).

In ASON, escaping is not primarily used for characters, but to specify that not the default behaviour should be applied:

1. key for an empty map or sequence should be interpreted as a key value pair

2. space character should be ignored for splitting a string into key and value

3. a primitive value like a number, true, false or null should be interpreted as a string

E.g.:

    .a 5 -> key "a 5" with empty sequence as value
    \.a 5 -> key ".a" with value 5
    \\.a 5 -> key "\.a" with value 5
    --a 5 -> key "-a 5" with empty map as value
    \.this\ is\ a\ key and this a value -> key ".this is a key" with value "and this a value"
    key \5 -> key "key" with value "5" (a string, not a number)

Please note that it doesn't make much sense to define an empty map or sequence. It was just added to preserve compatibility with JSON.

ASON encourages the user to write space-less keys because spaces have to be escaped for keys. Most JSON data has space-less keys in it. The author also recommends to use camelCase for keys.

## Strict Mode

A strict mode may be applied. It is recommended when a human types in ASON data. If JSON is converted to ASON, the result may be compliant to the strict mode but doesn't have to. The strict mode aborts the parsing when one of the following rules is disregarded:

1. no empty lines (a line is empty if it contains only invisible characters)
3. no whitespace at the end of the line
5. no (invisible) characters with code point 0000-001F in content
6. no empty map key
7. no spaces in map key
8. no empty values
9. no empty maps
10. no empty sequences