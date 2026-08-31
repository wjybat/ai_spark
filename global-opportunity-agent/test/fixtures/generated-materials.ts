import type { GeneratedBriefInput, GeneratedProductInput } from "../../src/agent/generated-materials.js";

export const productInput: GeneratedProductInput = {
  customerId: "cencosud",
  analysis: {
    positioning: "从电商增长后的订单与库存衔接问题入手，先验证一个暗店履约场景，再判断是否值得扩展到区域平台。客户是否存在具体采购计划仍待确认。",
    matches: [{
      capabilityId: "oms-fulfilment", fitScore: 88,
      reasons: ["电商增长信号提示应先核验订单承诺与拣货衔接问题，而不是直接建议更换电商平台。", "建议先梳理门店和暗店的库存承诺责任边界，以判断 OMS 是否存在补充价值。"],
      pilotScope: "选择一个待客户确认的暗店流程，观察库存承诺、拣货异常和订单状态一致性；所有基线及验收指标由双方确认后再确定。",
      prerequisites: ["客户需确认当前订单主系统、库存刷新频率及开放接口的可用性。"],
      caution: "电商增长不能证明 OMS 已立项，也不能据此承诺统一库存或成本改善幅度。",
      evidenceIds: ["cencosud-q2-2026"],
    }, {
      capabilityId: "open-platform", fitScore: 78,
      reasons: ["区域平台战略意味着需要先识别商品和库存主数据的责任归属，避免建立重复的平台能力。", "集成层可以作为接口验证假设，但需要 SAP 及本地系统所有者共同确定读写权限。"],
      pilotScope: "建议只验证一种库存状态的只读交换链路，保留 SAP 作为主系统，并在接口授权后观察状态延迟和异常处理能力。",
      prerequisites: ["先与客户确认区域平台接口负责人及主数据所有权。"],
      caution: "公开平台战略不证明第三方集成接口已经开放，更不构成替换 SAP 的依据。",
      evidenceIds: ["cencosud-cencoday-2026"],
    }],
    avoidClaims: ["不得把区域平台战略解读为已进入第三方系统采购流程。"],
  },
};

export const emailInput: GeneratedBriefInput = {
  customerId: "cencosud",
  email: {
    subject: "A focused discussion on Cencosud's fulfilment handoffs",
    body: [
      "Hi [First name],", "",
      "Cencosud's reported e-commerce growth caught our attention. As online activity expands, how inventory promises translate into picking and order status is one operational question worth exploring, without assuming there is a gap in your current systems.", "",
      "Dmall could discuss a narrowly scoped fulfilment workflow alongside your existing platforms. We would first want to understand which teams own the order and inventory interfaces, where exceptions are handled, and what evidence would justify a pilot. Any scope or success measures would need your team's validation.", "",
      "Would you be open to a short conversation about that workflow, or could you point us to the appropriate colleague?", "",
      "Best regards,", "[Your name]",
    ].join("\n"),
    angle: "以已核验的电商增长作为开场，将匹配阶段的订单与库存衔接建议转成探索性问题；不假设已存在项目，也不对效果作承诺。",
    evidenceIds: ["cencosud-q2-2026"],
  },
};
