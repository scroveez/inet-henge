import MetaData from './meta_data';
import Node from './node';

class Link {
  constructor(data, id, meta_keys, link_width) {
    this.id = id;
    this.source = Node.id_by_name(data.source);
    this.target = Node.id_by_name(data.target);
    this.meta = new MetaData(data.meta).get(meta_keys);
    this.source_meta = new MetaData(data.meta, 'source').get(meta_keys);
    this.target_meta = new MetaData(data.meta, 'target').get(meta_keys);

    if (typeof link_width === 'function')
      this.width = link_width(data.meta) || 1;
    else
      this.width = link_width || 1;

    this.label_x_offset = 20;
    this.label_y_offset = 1.5; // em
  }

  is_named_path() {
    return this.meta.length > 0;
  }

  is_reverse_path() {
    return this.target_meta.length > 0;
  }

  d() {
    return `M ${this.source.x} ${this.source.y} L ${this.target.x} ${this.target.y}`;
  }

  path_id() {
    return `path${this.id}`;
  }

  // OPTIMIZE: Implement better right-alignment of the path, especially for multi tspans
  tspan_x_offset() {
    if (this.is_named_path())
      return 0;
    else if (this.is_reverse_path())
      return -this.label_x_offset;
    else
      return this.label_x_offset;
  }

  tspan_y_offset() {
    if (this.is_named_path())
      return `${-this.label_y_offset + 0.7}em`;
    else
      return `${this.label_y_offset}em`;
  }

  rotate(bbox) {
    if (this.source.x > this.target.x)
      return `rotate(180 ${bbox.x + bbox.width / 2} ${bbox.y + bbox.height / 2})`;
    else
      return 'rotate(0)';
  }

  split() {
    if (!this.meta && !this.source_meta && !this.target_meta)
      return [this];

    const meta = [];
    ['meta', 'source_meta', 'target_meta'].forEach((key, i, keys) => {
      if (this[key]) {
        const duped = Object.assign(Object.create(this), this);

        keys.filter((k) => k !== key).forEach((k) => duped[k] = []);
        meta.push(duped);
      }
    });

    return meta;
  }

  has_meta() {
    return this.meta.length > 0 || this.source_meta.length > 0 || this.target_meta.length > 0;
  }

  static render_links(svg, links) {
    return svg.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .attr('stroke-width', (d) => d.width);
  }

  static render_paths(svg, links) {
    const labelled_links = links.filter((l) => l.has_meta());
    const paths = Link.create_paths(svg, labelled_links);

    const split_labelled_links = labelled_links.map((l) => l.split()).reduce((x, y) => x.concat(y), [])
          .filter((l) => l.has_meta());
    const labels = this.create_labels(svg, split_labelled_links);

    Link.zoom();  // Initialize
    return [paths, labels];
  }

  static create_paths(svg, links) {
    return svg.selectAll('.path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', (d) => d.d())
      .attr('id', (d) => d.path_id());
  }

  static create_labels(svg, links) {
    const text = svg.selectAll('.path-label')
          .data(links)
          .enter()
          .append('text')
          .attr('class', 'path-label')
          .attr('pointer-events', 'none');
    const text_path = text.append('textPath')
          .attr('xlink:href', (d) => `#${d.path_id()}`);

    text_path.each(function(d) {
      Link.append_tspans(this, d.meta);
      Link.append_tspans(this, d.source_meta);
      Link.append_tspans(this, d.target_meta);

      if (d.is_named_path())
        Link.center(this);

      if (d.is_reverse_path())
        Link.the_other_end(this);
    });

    return text;
  }

  static the_other_end(container) {
    d3.select(container)
      .attr('class', 'reverse')
      .attr('text-anchor', 'end')
      .attr('startOffset', '100%');
  }

  static center(container) {
    d3.select(container)
      .attr('class', 'center')
      .attr('text-anchor', 'middle')
      .attr('startOffset', '50%');
  }

  static append_tspans(container, meta) {
    meta.forEach((m, i) => {
      d3.select(container).append('tspan')
        .attr('x', (d) => d.tspan_x_offset())
        .attr('dy', (d) => d.tspan_y_offset())
        .attr('class', m.class)
        .text(m.value);
    });
  }

  static tick(link, path, label) {
    link.attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);

    if (path)
      path.attr('d', (d) => d.d());
    if (label)
      label.attr('transform', function(d) {
        return d.rotate(this.getBBox());
      });
  }

  static zoom(scale) {
    let visibility = 'hidden';
    if (scale && scale > 1.5)
      visibility = 'visible';

    d3.selectAll('.path-label')
      .style('visibility', visibility);
  }
}

module.exports = Link;
