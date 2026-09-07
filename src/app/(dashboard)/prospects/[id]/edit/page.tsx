import UpdateProspectPage from '@/Features/prospects/UpdateProspect'
import AccessGate from "@/components/shared/AccessDenied";


const UpdatePage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params
  return (
    <AccessGate allowance="prospectUpdate" label="editing prospects">
      <div>
        <UpdateProspectPage prospectId={id} />
      </div>
    </AccessGate>
  )
}

export default UpdatePage