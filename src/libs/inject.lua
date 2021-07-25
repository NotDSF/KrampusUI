local protoCount = -1;

-- https://github.com/NotDSF/Lua-Serializer/

local config = {
  spaces = 4
};

local format   = string.format;
local rep      = string.rep;
local Type     = type;
local Pairs    = pairs;
local gsub     = string.gsub;
local Tostring = tostring;
local concat   = table.concat;
local Tab      = rep(" ", config.spaces or 4);

local Serialize;
local function formatIndex(idx, scope)
  local indexType = Type(idx);
  local finishedFormat = idx;
  if indexType == "string" then
    finishedFormat = format("\"%s\"", idx); 
  elseif indexType == "table" then
    scope = scope + 1;
    finishedFormat = Serialize(idx, scope);
  end;
  return format("[%s]", finishedFormat);
end;

local function formatString(str) 
  for i,v in Pairs({ ["\n"] = "\\n", ["\t"] = "\\t", ["\""] = "\\\"" }) do
    str = gsub(str, i, v);
  end;
  return str;
end;

Serialize = function(tbl, scope) 
  scope = scope or 0;

  local Serialized = {}; -- For performance reasons
  local scopeTab = rep(Tab, scope);
  local scopeTab2 = rep(Tab, scope+1);

  local tblLen = 0;
  for i,v in Pairs(tbl) do
    local formattedIndex = formatIndex(i, scope);
    local valueType = Type(v);
    local SerializeIndex = #Serialized + 1;
    if valueType == "string" then -- Could of made it inline but its better to manage types this way.
      Serialized[SerializeIndex] = format("%s%s = \"%s\",\n", scopeTab2, formattedIndex, formatString(v));
    elseif valueType == "number" or valueType == "boolean" then
      Serialized[SerializeIndex] = format("%s%s = %s,\n", scopeTab2, formattedIndex, Tostring(v));
    elseif valueType == "table" then
      Serialized[SerializeIndex] = format("%s%s = %s,\n", scopeTab2, formattedIndex, Serialize(v, scope+1));
    elseif valueType == "userdata" then
      Serialized[SerializeIndex] = format("%s%s = newproxy(),\n", scopeTab2, formattedIndex);
    else
      Serialized[SerializeIndex] = format("%s%s = \"%s\",\n", scopeTab2, formattedIndex, Tostring(valueType)); -- Unsupported types.
    end;
    tblLen = tblLen + 1; -- # messes up with nil values
  end;

  -- Remove last comma
  local lastValue = Serialized[#Serialized];
  if lastValue then
    Serialized[#Serialized] = lastValue:sub(0, -3) .. "\n";
  end;

  if tblLen > 0 then
    if scope < 1 then
      return format("{\n%s}", concat(Serialized));  
    else
      return format("{\n%s%s}", concat(Serialized), scopeTab);
    end;
  else
    return "{}";
  end;
end;

loadstring = function(src) 
  return (function(vmTable, ...) -- Emulate a "wrap"
    print((gsub(src, "%(...%)}%)", ("%s})"):format(Serialize(vmTable)))));
  end);
end;

local function findTable(tbl, value) for i,v in Pairs(tbl) do if v == value then return value end; end; end; 
local function constantDump(tbl) 
  protoCount = protoCount + 1;
  return ("%s\n> Constants[%d] %s\n"):format(findTable(tbl, "checkifgay") and "Entry Point" or "Proto[" .. protoCount .. "]", #tbl, Serialize(tbl)); -- Bad way to check for the main script closure ik. Plus its not good for performance
end;