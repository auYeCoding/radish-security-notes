import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";

/**
 * 鼠标按下后移动超过这个像素数才开始拖拽, 之前仍是普通的单击.
 */
export const DRAG_ACTIVATION_DISTANCE_PIXELS = 8;

/**
 * 键盘拖拽用的按键 (`KeyboardEvent.code`): 在可拖拽元素上按 M 开始, 回车或空格放下, Esc 取消.
 * 不用回车与空格开始, 因为拖拽源本身是按钮, 这两个键用来选中它.
 */
const KEYBOARD_DRAG_CODES = {
  start: ["KeyM"],
  cancel: ["Escape"],
  end: ["Enter", "Space"],
};

/**
 * 拖放过程中给读屏软件播报的文字, 由调用方按当前语言与业务名称生成.
 */
export interface DragDropAnnouncements {
  /**
   * 拿起拖拽源时的播报.
   * @param sourceId 拖拽源编号.
   * @returns 播报文字.
   */
  readonly pickedUp: (sourceId: string) => string;
  /**
   * 拖拽源移到某个放置目标上方或离开所有目标时的播报.
   * @param sourceId 拖拽源编号.
   * @param targetId 放置目标编号, 不在任何目标上方时为 undefined.
   * @returns 播报文字.
   */
  readonly movedOver: (
    sourceId: string,
    targetId: string | undefined,
  ) => string;
  /**
   * 放下拖拽源时的播报.
   * @param sourceId 拖拽源编号.
   * @param targetId 放置目标编号, 没有放在任何目标上时为 undefined.
   * @returns 播报文字.
   */
  readonly dropped: (sourceId: string, targetId: string | undefined) => string;
  /**
   * 取消拖拽时的播报.
   * @param sourceId 拖拽源编号.
   * @returns 播报文字.
   */
  readonly cancelled: (sourceId: string) => string;
}

/**
 * 拖放根的属性.
 */
interface DragDropProviderProps {
  /**
   * 拖拽源与放置目标所在的子树.
   */
  readonly children: ReactNode;
  /**
   * 把拖拽源放在某个放置目标上时的回调, 参数是两者的编号.
   */
  readonly onDrop: (sourceId: string, targetId: string) => void;
  /**
   * 生成拖拽过程中跟随指针的预览.
   */
  readonly renderPreview: (sourceId: string) => ReactNode;
  /**
   * 读屏播报文字.
   */
  readonly announcements: DragDropAnnouncements;
  /**
   * 给读屏软件的操作说明, 挂在每个拖拽源上.
   */
  readonly instructions: string;
}

/**
 * 碰撞检测: 指针落在某个放置目标上时取它, 否则 (例如键盘拖拽没有指针) 取与拖拽预览相交最多的目标.
 * @param args dnd-kit 给出的碰撞检测参数.
 * @returns 碰撞到的放置目标, 最先的是命中的目标.
 */
const detectCollisions: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

/**
 * 把项目自己的播报接口转成 dnd-kit 的播报接口.
 * @param announcements 项目的播报文字.
 * @returns dnd-kit 的播报.
 */
function toLibraryAnnouncements(
  announcements: DragDropAnnouncements,
): Announcements {
  return {
    onDragStart: ({ active }) => announcements.pickedUp(String(active.id)),
    onDragOver: ({ active, over }) =>
      announcements.movedOver(
        String(active.id),
        over === null ? undefined : String(over.id),
      ),
    onDragEnd: ({ active, over }) =>
      announcements.dropped(
        String(active.id),
        over === null ? undefined : String(over.id),
      ),
    onDragCancel: ({ active }) => announcements.cancelled(String(active.id)),
  };
}

/**
 * 拖放根: 包住拖拽源与放置目标, 管理鼠标与键盘两种拖拽, 拖拽时显示跟随指针的预览, 放下时回调.
 * 是 dnd-kit 的适配层, 其余代码不直接引用 dnd-kit.
 * @param props 组件属性.
 * @returns 拖放根元素.
 */
export function DragDropProvider(
  props: DragDropProviderProps,
): React.JSX.Element {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PIXELS },
    }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_DRAG_CODES }),
  );
  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveId(undefined);
    if (event.over !== null) {
      props.onDrop(String(event.active.id), String(event.over.id));
    }
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={detectCollisions}
      accessibility={{
        announcements: toLibraryAnnouncements(props.announcements),
        screenReaderInstructions: { draggable: props.instructions },
      }}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(undefined)}
    >
      {props.children}
      <DragOverlay dropAnimation={null}>
        {activeId === undefined ? null : props.renderPreview(activeId)}
      </DragOverlay>
    </DndContext>
  );
}
