# ASON
The aesthetically pleasant object notation simplifies the notation of JSON data.

Whitespace is used to define the structure. The symbols - and . are used to introduce a map or sequence. The default context is a sequence.
  
## Examples:

### Map

A map has several mappings (key value pairs). In a sequence, use the symbol - to introduce a map.

    -
     myKey my Value
    -
     otherKey more value
     
Becomes

    [{"myKey":"my Value"},{"otherKey":"more value"}]
     
No need to use the - symbol in a map:

    -
     nestedMap
      key1 value1
      key2 value2
      
Becomes

    {"nestedMap":{"key1":"value1","key2":"value2"}}
    
### Sequence

The key for a sequence starts with a dot. Indent the next line with one space character. Write the elements of the sequence with the same indention:

    -
     .mySequence
      element1
      another
      5
      a beautiful day
     
Is converted to:

    {"mySequence":["element1","another",5,"a beautiful day"]}
    
Read the specification for more information or try it out:
http://moglars.github.io/asonTrainer.html

ASON can be converted to JSON and vice versa.
