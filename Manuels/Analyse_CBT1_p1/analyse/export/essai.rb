file = File.join(__dir__,'analyse-29_11_2022.html')
code = File.read(file)


regsvg = /<div(.*?)class="amark aobj img(.+?)width:(.+?);(.*?)height:(.+?);(.+?)><img(.+?)src=\"(.+?)\.svg\"(.*?)>/m

regsvg = /<div(.*?)class="amark aobj img(.+?)width:/
puts code.match?(regsvg)
