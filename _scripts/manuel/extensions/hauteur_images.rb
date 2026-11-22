# Extension Asciidoctor : `height=N` seul sur une image (bloc `image::` ou
# en ligne `image:`) → ajout de la largeur correspondante, calculée
# d'après les proportions du fichier (PNG, SVG). La feuille de style
# (img { height:auto }) respecte alors la hauteur voulue, en HTML comme
# en EPUB.
require 'asciidoctor/extensions'

class HauteurImages < Asciidoctor::Extensions::Treeprocessor
  INLINE = /(image:(?!:)([^\[\s]+)\[)([^\]]*)\]/

  def process doc
    @doc = doc
    doc.find_by(traverse_documents: true) { true }.each do |node|
      if node.context == :image
        w = width_for(node.attr('target'), node.attr('height'), node.attr('width'))
        node.set_attr('width', w) if w
      end
      if node.respond_to?(:lines) && node.context == :paragraph
        node.lines.map! { |l| fix(l) }
      elsif node.instance_variable_defined?(:@text) && (t = node.instance_variable_get(:@text)).is_a?(String)
        node.instance_variable_set(:@text, fix(t))
      end
    end
    doc
  end

  # Ligne : images en ligne avec height et sans width
  def fix text
    text.gsub(INLINE) do
      m = $~
      head, target, attrs = m[1], m[2], m[3]
      h = attrs[/(?:^|,)\s*height\s*=\s*"?(\d+)/, 1]
      w = attrs.match?(/(?:^|,)\s*width\s*=/)
      if h && !w && (nw = width_for(target, h, nil)) then "#{head}#{attrs}, width=#{nw}]" else m[0] end
    end
  end

  def width_for target, h, w
    return nil if h.nil? || (w && !w.to_s.empty?)
    path = File.join(@doc.base_dir, @doc.attr('imagesdir', ''), target)
    path = File.join(@doc.base_dir, target) unless File.exist?(path)
    return nil unless File.exist?(path)
    iw, ih = dims(path)
    return nil unless iw && ih && ih > 0
    (h.to_f * iw / ih).round
  end

  def dims path
    case File.extname(path).downcase
    when '.png'
      File.binread(path, 24)[16, 8].unpack('NN')
    when '.svg'
      s = File.read(path, 4000)
      if (vb = s[/viewBox\s*=\s*"([^"]+)"/, 1]) then vb.split(/[\s,]+/)[2, 2].map(&:to_f)
      else [s[/\swidth\s*=\s*"([\d.]+)/, 1], s[/\sheight\s*=\s*"([\d.]+)/, 1]].map { |v| v && v.to_f } end
    end
  rescue StandardError
    nil
  end
end

Asciidoctor::Extensions.register do
  treeprocessor HauteurImages
end
