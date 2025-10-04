import PlayClient from "../../../components/PlayClient";

export default async function Page({ params }) {
  const { episodeId } = await params;
  return <PlayClient episodeId={episodeId} />;
}
