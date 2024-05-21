import { PropsWithChildren, useState } from 'react'
import styles from './modal.module.scss'

type ScaleModalProps = {
  type: "add" | "edit" | null,
  scale?: {
    id?: string,
    goal?: string,
    chasingSuccessDescription?: string,
    avoidingFailureDescription?: string
  }
  onEdit: (scaleData: any)=> void
  onAdd: (scaleData: any)=> void
  onDelete: (scaleData: any)=> void
  onClose: ()=>void
}
const ScaleModal = (props: PropsWithChildren<ScaleModalProps>) =>{
  const [modalData, setModalData] = useState(props.scale)

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <span className={styles.closeModal} onClick={props.onClose}>&times;</span>
        <div className={styles.header}>
          <h3>
            {props.type=='add' ? "Create a new Scale"
            : props.type=="edit" ? "Edit Scale" : null}
          </h3>
        </div>
        <label htmlFor="goal">Goal</label>
        <input
          type="text"
          name="goal"
          placeholder="Enter you goal..."
          onChange={(e)=>setModalData({...modalData, goal: e.target.value})}
          defaultValue={modalData?.goal} required={true}
        />

        <label htmlFor="success-metrics">Metrics for Chasing Success</label>
        <textarea
          name="success-metrics"
          placeholder='Your metrics for chasing success...'
          onChange={(e)=>setModalData({...modalData, chasingSuccessDescription: e.target.value})}
          defaultValue={modalData?.chasingSuccessDescription}
        />

        <label htmlFor="failure-metrics">Metrics for Avoiding Failure</label>
        <textarea
          name="failure-metrics"
          placeholder='Your metrics for avoiding failure...'
          onChange={(e)=>setModalData({...modalData, avoidingFailureDescription: e.target.value})}
          defaultValue={modalData?.avoidingFailureDescription}
        />

        <div className={styles.buttons}>
          {props.type=="edit" ?
            <>
            <button className="danger" onClick={props.onDelete}>Delete Scale</button>
            <button className="commit" onClick={()=> props.onEdit(modalData)}>Update Scale</button>
            </>
          :props.type=="add" ?
            <>
            <button onClick={props.onClose}>Cancel</button>
            <button className="commit" onClick={()=> props.onAdd(modalData)}>Create Scale</button>
            </>
          : null}
        </div>
      </div>
    </div>
  )
}
export default ScaleModal
