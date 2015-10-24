# ASON
The aesthetically pleasant object notation simplifies the notation of JSON data.

## Important points:
  - Whitespace instead of brackets
  - Put a dot (.) in front of a key to define a sequence
  - Indenting creates a new context (map or sequence)
  - Default context is "map"
  - if a value can be a number, it is a number (no enclosing " characters in the JSON output)
  
## Examples:

### Mapping
A mapping consists of a key and a value. The key contains the characters at the beginning of the line up to the first space character:
    
    myKey my Value

This is converted to

    {"myKey":"my Value"}
    
### Map
A map has several mappings (key value pairs). It is defined by indenting the next line with one space character.

    myMap
     myKey my Value
     
Gets

    {"myMap":{"myKey":"my Value"}}
     
### Sequence
The key for a sequence starts with a dot. Indent the next line with one space character. Write the elements of the sequence with the same indention:

    .mySequence
     element1
     another
     5
     a beautiful day
     
Is converted to:

    {"mySequence":["element1","another",5,"a beautiful day"]}
    
### Map and Sequence in Sequences
The notation of maps and sequences within another sequence:
<pre>
.mySequence
 .
  first element of nested sequence
 
  key value of anonymous map
  key2 have a nice day
</pre>

Result

    {"mySequence":[["first element of nested sequence"],{"key":"value of anonymous map","key2":"have a nice day"}]}
    
Note the space character on the third line. With the indention on the next line, you create an anonymous map (a map without a key)

Try it out: http://jsfiddle.net/mfevw5pb/22/


