import { Icon } from "../ui/icons";

export const dynamic = "force-dynamic";

export default function RetailersPage(): React.JSX.Element {
  return (
    <>
      <h1 className="page-title">Retailers</h1>
      <p className="page-sub">重点零售商与门店观测数据。</p>
      <div className="empty-state">
        <Icon name="store" size={28} />
        <div style={{ marginTop: 8 }}>零售商模块将在接入零售商级证据采集后开放（当前 fixture 为国家级数据）。</div>
      </div>
    </>
  );
}
