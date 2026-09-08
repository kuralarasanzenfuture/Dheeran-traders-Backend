export const buildPermissionTree = (rows) => {
  const map = {};
  const tree = [];

  rows.forEach(r => {
    map[r.module_id] = {
      ...r,
      actions: [],
      children: []
    };
  });

  rows.forEach(r => {
    const node = map[r.module_id];

    node.actions.push({
      action_id: r.action_id,
      action_code: r.action_code,
      is_allowed: r.is_allowed
    });

    if (r.parent_id) {
      map[r.parent_id]?.children.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
};