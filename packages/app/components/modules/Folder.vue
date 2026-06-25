<script setup lang="ts">
import type { ModuleDest, ModuleListItem, SessionContext } from '@rolldown-analyzer/core/types';
import { computed } from 'vue';
import { isVirtualModuleId } from '../../utils/filepath';
import { toTree } from '../../utils/format';

const props = defineProps<{
  session: SessionContext;
  modules: ModuleListItem[];
  splitBySource?: boolean;
  link?: string | boolean;
}>();

const emit = defineEmits<{
  (e: 'select', node: ModuleDest): void;
}>();

function hasTreeNodeContent(node: { children: Record<string, unknown>; items: unknown[] }) {
  return Object.keys(node.children).length > 0 || node.items.length > 0;
}

const moduleTree = computed(() => {
  if (!props.session.modulesList.length) {
    return {
      workspace: {
        children: {},
        items: [],
      },
      nodeModules: {
        children: {},
        items: [],
      },
      virtual: {
        children: {},
        items: [],
      },
    };
  }
  const inWorkspace: ModuleDest[] = [];
  const inNodeModules: ModuleDest[] = [];
  const inVirtual: ModuleDest[] = [];

  props.modules
    .map((i) => ({ full: i.id, path: i.path! }))
    .forEach((i) => {
      if (props.splitBySource === false) {
        inWorkspace.push(i);
        return;
      }

      if (props.session.meta.cwd && i.full.startsWith(props.session.meta.cwd)) {
        if (!i.path.startsWith('../')) {
          i.path = i.full.slice(props.session.meta.cwd.length + 1);
        }

        inWorkspace.push(i);
      } else if (i.full.includes('node_modules')) {
        inNodeModules.push({
          full: i.full,
          path: i.full,
        });
      } else if (isVirtualModuleId(i.full)) {
        inVirtual.push(i);
      } else {
        inWorkspace.push(i);
      }
    });

  return {
    workspace: toTree(inWorkspace, 'Project Root', {
      isFlat: (mod) => isVirtualModuleId(mod.full),
    }),
    nodeModules: toTree(inNodeModules, 'Node Modules'),
    virtual: toTree(inVirtual, 'Virtual Modules', { isFlat: (mod) => isVirtualModuleId(mod.full) }),
  };
});
</script>

<template>
  <div of-auto max-h-screen pt-45 relative>
    <div flex="~ col gap-2" p4>
      <DisplayTreeNode
        v-if="hasTreeNodeContent(moduleTree.workspace)"
        :node="moduleTree.workspace"
        p="l3"
        icon="i-catppuccin:folder-dist icon-catppuccin"
        icon-open="i-catppuccin:folder-dist-open icon-catppuccin"
        :link="link ?? true"
        :child-open="splitBySource !== false"
        @select="emit('select', $event)"
      />

      <template v-if="hasTreeNodeContent(moduleTree.nodeModules)">
        <div w-full h-1px border="t base" />
        <DisplayTreeNode
          :node="moduleTree.nodeModules"
          p="l3"
          icon="i-catppuccin:folder-node icon-catppuccin"
          icon-open="i-catppuccin:folder-node-open icon-catppuccin"
          :link="link ?? true"
          :open="false"
          @select="emit('select', $event)"
        />
      </template>

      <template v-if="hasTreeNodeContent(moduleTree.virtual)">
        <div w-full h-1px border="t base" />
        <DisplayTreeNode
          :node="moduleTree.virtual"
          p="l3"
          icon="i-catppuccin:folder-components icon-catppuccin"
          icon-open="i-catppuccin:folder-components-open icon-catppuccin"
          :link="link ?? true"
          :open="false"
          @select="emit('select', $event)"
        />
      </template>
    </div>
  </div>
</template>
